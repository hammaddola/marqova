import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { getSellerContext, requireUser } from "@/server/session";
import { PageHeader } from "@/components/layout/console-shell";
import { OnboardingForm } from "@/components/seller/onboarding-form";
import { Card } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { StatusPill } from "@/components/account/status-pill";

export const metadata = { title: "Seller onboarding" };

export default async function OnboardingPage() {
  await requireUser("/seller/onboarding");
  const ctx = await getSellerContext();
  const p = ctx?.profile;
  if (p?.status === "APPROVED") redirect("/seller");

  if (p && p.status !== "REJECTED") {
    const verifications = await db.verification.findMany({ where: { sellerProfileId: p.id } });
    return (
      <div className="max-w-2xl">
        <PageHeader title="Application received" subtitle="We verify every seller before they can list — that's what makes Marqova trustworthy." />
        <Card className="p-6">
          <p className="flex items-center gap-2 font-semibold">
            {p.status === "PENDING" ? <Clock className="size-5 text-gold-text" aria-hidden /> : <XCircle className="size-5 text-crimson" aria-hidden />}
            Status: <StatusPill status={p.status} />
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {verifications.map((v) => (
              <li key={v.id} className="flex items-center justify-between rounded-md bg-sand-50 px-3 py-2">
                <span className="capitalize">{v.type.replace(/_/g, " ").toLowerCase()}</span>
                <StatusPill status={v.status} />
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-slate">Typical review time is 1–2 business days. We&apos;ll notify you by email and in your account.</p>
          <Button asChild variant="secondary" className="mt-4">
            <Link href="/">Back to the store</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="Become a Marqova seller" subtitle="Three quick steps: about you, your store, and how you get paid." />
      {p?.status === "REJECTED" && (
        <p className="mb-4 flex items-start gap-2 rounded-[8px] bg-crimson-50 p-4 text-sm text-crimson">
          <XCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> Your previous application was not approved{p.rejectionReason ? `: ${p.rejectionReason}` : ""}. You can update your details and re-apply.
        </p>
      )}
      <OnboardingForm />
      <p className="mt-6 flex items-center gap-2 text-xs text-slate">
        <CheckCircle2 className="size-4 text-emerald" aria-hidden /> We store only the last 4 digits of your account number. Documents are visible to the verification team only.
      </p>
    </div>
  );
}
