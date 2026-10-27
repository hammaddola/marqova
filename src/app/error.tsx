"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main id="main" className="grid min-h-[60dvh] place-items-center px-6 text-center">
      <div>
        <AlertTriangle className="mx-auto size-12 text-crimson" aria-hidden />
        <h1 className="heading-display mt-4 text-3xl">Something went wrong</h1>
        <p className="mt-2 max-w-md text-slate">Please try again. If the problem continues, our team has been notified{error.digest ? ` (ref ${error.digest})` : ""}.</p>
        <Button variant="navy" className="mt-6" onClick={reset}>
          Try again
        </Button>
      </div>
    </main>
  );
}
