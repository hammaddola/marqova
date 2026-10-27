import type { Metadata } from "next";
import { ConsoleShell } from "@/components/layout/console-shell";
import { db } from "@/lib/db";
import { requireRole } from "@/server/session";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin" }, robots: { index: false } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireRole(["ADMIN"], "/admin");
  const [sellers, reviews, disputes, failedJobs] = await Promise.all([
    db.sellerProfile.count({ where: { status: "PENDING" } }),
    db.review.count({ where: { status: "FLAGGED" } }),
    db.return.count({ where: { status: { in: ["REJECTED", "DISPUTED"] }, resolution: { not: { startsWith: "Marqova:" } } } }),
    db.job.count({ where: { status: "FAILED" } }),
  ]);
  return (
    <ConsoleShell
      area="Admin"
      user={user.name ?? ""}
      items={[
        { href: "/admin", label: "Overview & reports", icon: "FileBarChart" },
        { href: "/admin/sellers", label: "Seller approvals", icon: "BadgeCheck", badge: sellers },
        { href: "/admin/listings", label: "Listing moderation", icon: "ShieldAlert" },
        { href: "/admin/reviews", label: "Review moderation", icon: "Star", badge: reviews },
        { href: "/admin/categories", label: "Categories & commissions", icon: "FolderTree" },
        { href: "/admin/disputes", label: "Disputes & refunds", icon: "Scale", badge: disputes },
        { href: "/admin/homepage", label: "Homepage sections", icon: "LayoutTemplate" },
        { href: "/admin/users", label: "Users", icon: "Users" },
        { href: "/admin/jobs", label: "Job queue", icon: "ListTodo", badge: failedJobs },
      ]}
    >
      {children}
    </ConsoleShell>
  );
}
