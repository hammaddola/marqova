import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimit, refundRateLimit } from "@/lib/rate-limit";
import { clientIpFrom } from "@/lib/request";
import type { Role } from "@/generated/prisma/enums";

declare module "next-auth" {
  interface Session {
    user: { id: string; role: Role } & DefaultSession["user"];
  }
}

const credentialsSchema = z.object({ email: z.email(), password: z.string().min(1).max(200) });

export const googleEnabled = !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw, request) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        // Attempts are reserved synchronously before any await (no check-then-act race) and
        // refunded on success, so only failures accumulate:
        //  - 8 failures per email + client IP per 15 min (IP only trusted behind TRUST_PROXY);
        //  - 20 failures per email per 15 min from anywhere. A temporary 15-minute lockout is the
        //    deliberate trade-off against distributed guessing (see DECISIONS.md D17).
        const email = parsed.data.email.toLowerCase();
        const ip = request ? clientIpFrom(request.headers) : null;
        const ipKey = ip ? `login-fail:${email}:${ip}` : null;
        const emailKey = `login-fail:${email}`;
        const byIp = ipKey ? rateLimit(ipKey, 8, 15 * 60_000).ok : true;
        const byEmail = rateLimit(emailKey, 20, 15 * 60_000).ok;
        if (!byIp || !byEmail) return null;
        const user = await db.user.findUnique({ where: { email } });
        const ok = !!user?.passwordHash && (await bcrypt.compare(parsed.data.password, user.passwordHash));
        if (!ok || !user) return null;
        if (ipKey) refundRateLimit(ipKey);
        refundRateLimit(emailKey);
        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
    ...(googleEnabled ? [Google] : []),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Google users are created on first sign-in (no adapter needed with JWT sessions).
      if (account?.provider === "google") {
        if (!user.email || profile?.email_verified !== true) return "/login?error=unverified";
        const email = user.email.toLowerCase();
        const existing = await db.user.findUnique({ where: { email }, select: { passwordHash: true } });
        // Never attach Google to a password account automatically: whoever registered that
        // email first (possibly an attacker) would share the account. The owner signs in with
        // their password instead; explicit account linking is a P1 item.
        if (existing?.passwordHash) return "/login?error=use-password";
        await db.user.upsert({
          where: { email },
          update: { name: user.name ?? undefined, image: user.image ?? undefined },
          create: { email, name: user.name, image: user.image, emailVerified: new Date() },
        });
      }
      return true;
    },
    async jwt({ token, user, trigger }) {
      // Resolve the database id + role on sign-in, and whenever the session is refreshed
      // (e.g. after a shopper becomes a seller).
      if (user?.email || trigger === "update") {
        const email = (user?.email ?? token.email)?.toLowerCase();
        const dbUser = email ? await db.user.findUnique({ where: { email }, select: { id: true, role: true, name: true } }) : null;
        if (dbUser) {
          token.uid = dbUser.id;
          token.role = dbUser.role;
          token.name = dbUser.name;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.uid) session.user.id = token.uid as string;
      session.user.role = (token.role as Role) ?? "SHOPPER";
      return session;
    },
  },
});
