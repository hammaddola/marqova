import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/auth-forms";
import { Card } from "@/components/ui/primitives";
import { googleEnabled } from "@/auth";
import { getSessionUser } from "@/server/session";
import { safeNextPath } from "@/lib/request";
import { Reveal } from "@/components/motion";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = safeNextPath(sp.next);
  if (await getSessionUser()) redirect(next);
  return (
    <div className="container-page grid min-h-[70dvh] place-items-center py-12">
      <Reveal className="w-full max-w-md">
        <Card className="p-8">
          <h1 className="heading-display text-3xl">Welcome back</h1>
          <p className="mt-1 mb-6 text-sm text-slate">Sign in to track orders, save sizes and check out faster.</p>
          {sp.error === "use-password" && <p role="alert" className="mb-4 rounded-md bg-crimson-50 px-3 py-2 text-sm text-crimson">This email already has a Marqova password. Sign in with your password instead.</p>}
          {sp.error === "unverified" && <p role="alert" className="mb-4 rounded-md bg-crimson-50 px-3 py-2 text-sm text-crimson">Your Google email isn&apos;t verified, so we can&apos;t sign you in with Google.</p>}
          <LoginForm next={next} google={googleEnabled} />
        </Card>
        {process.env.NODE_ENV !== "production" && (
          <p className="mt-4 rounded-md bg-sand-50 p-3 text-xs text-slate">
            Development demo logins (password <code>Marqova123!</code>): shopper@marqova.dev · seller@marqova.dev · admin@marqova.dev
          </p>
        )}
      </Reveal>
    </div>
  );
}
