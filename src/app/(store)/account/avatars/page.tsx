import Link from "next/link";
import { Ruler, Trash2, ShieldCheck } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/server/session";
import { deleteAvatar } from "@/server/actions/shopper";
import { DEFAULT_SIZE_CHARTS, estimateBody, recommendSize } from "@/lib/fit";
import { ActionButton } from "@/components/ui/action-button";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Sizes & avatars" };

export default async function AvatarsPage() {
  const user = await requireUser("/account/avatars");
  const avatars = await db.avatarProfile.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] });
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="heading-display text-3xl">Sizes & avatars</h1>
        <Button asChild variant="gold" size="sm">
          <Link href="/try-on">Create in Try-On Studio</Link>
        </Button>
      </div>
      <p className="flex items-start gap-2 rounded-[8px] bg-emerald-50 p-4 text-sm text-emerald">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
        Your measurements are private to you, saved only with your consent, never shared with sellers, and deleted permanently when you remove them.
      </p>
      {!avatars.length && <EmptyState icon={<Ruler />} title="No avatars yet" body="Create an avatar in the Try-On Studio to get size recommendations on every clothing product." />}
      <ul className="grid gap-3 md:grid-cols-2">
        {avatars.map((a) => {
          const body = estimateBody(a);
          const top = recommendSize(DEFAULT_SIZE_CHARTS.TOP, body).recommended;
          const bottom = recommendSize(DEFAULT_SIZE_CHARTS.BOTTOM, body).recommended;
          const shoe = recommendSize(DEFAULT_SIZE_CHARTS.SHOES, body).recommended;
          return (
            <li key={a.id} className="rounded-[8px] border border-sand bg-white p-5 text-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">
                    {a.name} {a.isDefault && <Badge tone="gold" className="ml-1">Default</Badge>}
                  </p>
                  <p className="text-xs text-slate">
                    {a.body.toLowerCase()} · {a.heightCm} cm · {a.weightKg} kg · {a.shape.toLowerCase()} · consent given {formatDate(a.consentAt)}
                  </p>
                </div>
                <ActionButton variant="ghost" size="iconSm" aria-label="Delete avatar" confirm="Delete this avatar and its measurements permanently?" action={deleteAvatar.bind(null, a.id)}>
                  <Trash2 />
                </ActionButton>
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[
                  ["Tops", top],
                  ["Bottoms", bottom],
                  ["Shoes (EU)", shoe],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-md bg-sand-50 p-2">
                    <dt className="text-[11px] text-slate">{k}</dt>
                    <dd className="text-lg font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
