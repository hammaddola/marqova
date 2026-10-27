import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/auth-forms";
import { Card } from "@/components/ui/primitives";
import { googleEnabled } from "@/auth";
import { getSessionUser } from "@/server/session";
import { Reveal } from "@/components/motion";

export const metadata: Metadata = { title: "Create account", robots: { index: false } };

export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/";
  if (await getSessionUser()) redirect(next);
  return (
    <div className="container-page grid min-h-[70dvh] place-items-center py-12">
      <Reveal className="w-full max-w-md">
        <Card className="p-8">
          <h1 className="heading-display text-3xl">Create your account</h1>
          <p className="mt-1 mb-6 text-sm text-slate">One account for shopping, try-on avatars and selling.</p>
          <RegisterForm next={next} google={googleEnabled} />
        </Card>
      </Reveal>
    </div>
  );
}
