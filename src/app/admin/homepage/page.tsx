import { db } from "@/lib/db";
import { requireRole } from "@/server/session";
import { deleteHomeSection } from "@/server/actions/admin";
import { PageHeader } from "@/components/layout/console-shell";
import { ActionButton } from "@/components/ui/action-button";
import { StatusPill } from "@/components/account/status-pill";
import { Card } from "@/components/ui/primitives";
import { HomeSectionForm } from "@/components/admin/home-section-form";

export const metadata = { title: "Homepage sections" };

export default async function HomepageAdmin() {
  await requireRole(["ADMIN"]);
  const sections = await db.homeSection.findMany({ orderBy: { position: "asc" } });
  return (
    <div>
      <PageHeader title="Homepage sections" subtitle="Calm, single-message banners shown under the hero. No flashing banners — one gold action per area." actions={<HomeSectionForm />} />
      <Card className="divide-y divide-sand">
        {sections.map((s) => (
          <div key={s.id} className="flex flex-wrap items-center gap-3 p-4 text-sm">
            <span className="w-8 text-xs text-slate">#{s.position}</span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{s.title}</p>
              <p className="text-xs text-slate">{s.subtitle} {s.href && `→ ${s.href}`}</p>
            </div>
            <StatusPill status={s.active ? "ACTIVE" : "INACTIVE"} />
            <HomeSectionForm initial={{ id: s.id, title: s.title, subtitle: s.subtitle ?? "", href: s.href ?? "", position: s.position, active: s.active }} />
            <ActionButton size="sm" variant="ghost" confirm="Delete this section?" action={deleteHomeSection.bind(null, s.id)}>Delete</ActionButton>
          </div>
        ))}
        {!sections.length && <p className="p-4 text-sm text-slate">No sections yet.</p>}
      </Card>
    </div>
  );
}
