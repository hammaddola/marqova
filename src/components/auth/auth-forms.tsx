"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { googleSignInAction, loginAction, registerAction } from "@/server/actions/auth";

function PasswordInput({ id, name, autoComplete, invalid }: { id: string; name: string; autoComplete: string; invalid?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input id={id} name={name} type={show ? "text" : "password"} autoComplete={autoComplete} aria-invalid={invalid} required className="pr-11" />
      <button type="button" onClick={() => setShow(!show)} className="absolute top-1/2 right-1 grid size-9 -translate-y-1/2 place-items-center text-slate" aria-label={show ? "Hide password" : "Show password"}>
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

function GoogleButton({ next }: { next: string }) {
  return (
    <form action={googleSignInAction}>
      <input type="hidden" name="next" value={next} />
      <Button type="submit" variant="secondary" className="w-full">
        <svg viewBox="0 0 24 24" aria-hidden className="size-4">
          <path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8z" />
          <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.8c-1 .7-2.2 1-3.7 1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23z" />
          <path fill="#FBBC05" d="M5.8 14c-.2-.7-.4-1.3-.4-2s.1-1.4.4-2V7.2H2.1a11 11 0 0 0 0 9.6L5.8 14z" />
          <path fill="#EA4335" d="M12 5.4c1.6 0 3 .6 4.2 1.6l3.1-3.1A11 11 0 0 0 2.1 7.2L5.8 10C6.7 7.4 9.1 5.4 12 5.4z" />
        </svg>
        Continue with Google
      </Button>
    </form>
  );
}

export function LoginForm({ next, google }: { next: string; google: boolean }) {
  const [state, action, pending] = useActionState(loginAction, null);
  const f = state && !state.ok ? state.fields ?? {} : {};
  return (
    <div className="space-y-5">
      <form action={action} className="space-y-4" noValidate>
        <input type="hidden" name="next" value={next} />
        {state && !state.ok && (
          <p role="alert" className="rounded-md bg-crimson-50 px-3 py-2 text-sm text-crimson">
            {state.error}
          </p>
        )}
        <Field label="Email" htmlFor="email" error={f.email}>
          <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={!!f.email} />
        </Field>
        <Field label="Password" htmlFor="password" error={f.password}>
          <PasswordInput id="password" name="password" autoComplete="current-password" invalid={!!f.password} />
        </Field>
        <Button type="submit" variant="navy" size="lg" className="w-full" loading={pending}>
          Sign in
        </Button>
      </form>
      {google && (
        <>
          <Divider />
          <GoogleButton next={next} />
        </>
      )}
      <p className="text-center text-sm text-slate">
        New to Marqova?{" "}
        <Link href={`/register?next=${encodeURIComponent(next)}`} className="font-semibold text-gold-text hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}

export function RegisterForm({ next, google }: { next: string; google: boolean }) {
  const [state, action, pending] = useActionState(registerAction, null);
  const f = state && !state.ok ? state.fields ?? {} : {};
  return (
    <div className="space-y-5">
      <form action={action} className="space-y-4" noValidate>
        <input type="hidden" name="next" value={next} />
        {state && !state.ok && (
          <p role="alert" className="rounded-md bg-crimson-50 px-3 py-2 text-sm text-crimson">
            {state.error}
          </p>
        )}
        <Field label="Your name" htmlFor="name" error={f.name}>
          <Input id="name" name="name" autoComplete="name" required aria-invalid={!!f.name} />
        </Field>
        <Field label="Email" htmlFor="email" error={f.email}>
          <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={!!f.email} />
        </Field>
        <Field label="Password" htmlFor="password" error={f.password} hint="At least 8 characters with a letter and a number.">
          <PasswordInput id="password" name="password" autoComplete="new-password" invalid={!!f.password} />
        </Field>
        <Button type="submit" variant="gold" size="lg" className="w-full" loading={pending}>
          Create account
        </Button>
        <p className="text-xs text-slate">
          By creating an account you agree to our <Link href="/legal/terms" className="underline">terms</Link> and{" "}
          <Link href="/legal/privacy" className="underline">privacy notice</Link>.
        </p>
      </form>
      {google && (
        <>
          <Divider />
          <GoogleButton next={next} />
        </>
      )}
      <p className="text-center text-sm text-slate">
        Already have an account?{" "}
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-gold-text hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-3 text-xs text-slate">
      <span className="h-px flex-1 bg-sand" /> or <span className="h-px flex-1 bg-sand" />
    </div>
  );
}
