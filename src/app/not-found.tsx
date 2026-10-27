import Link from "next/link";
import { Compass } from "lucide-react";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="main" className="grid min-h-dvh place-items-center bg-ivory px-6 text-center">
      <div>
        <Logo />
        <Compass className="mx-auto mt-10 size-12 text-gold-text" aria-hidden />
        <h1 className="heading-display mt-4 text-4xl">We couldn&apos;t find that page</h1>
        <p className="mt-2 text-slate">It may have moved, or the listing is no longer available.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild variant="gold">
            <Link href="/">Go to home</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/search">Search products</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
