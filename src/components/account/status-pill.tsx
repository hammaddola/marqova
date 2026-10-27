import { cn } from "@/lib/utils";

const TONE: Record<string, string> = {
  PENDING_PAYMENT: "bg-sand-50 text-slate",
  PLACED: "bg-gold-100 text-gold-text",
  CONFIRMED: "bg-gold-100 text-gold-text",
  PENDING: "bg-gold-100 text-gold-text",
  ACCEPTED: "bg-gold-100 text-gold-text",
  PACKED: "bg-gold-100 text-gold-text",
  SHIPPED: "bg-navy-900 text-white",
  DELIVERED: "bg-emerald-50 text-emerald",
  CANCELLED: "bg-crimson-50 text-crimson",
  REFUNDED: "bg-sand-50 text-slate",
  RETURNED: "bg-sand-50 text-slate",
  REQUESTED: "bg-gold-100 text-gold-text",
  APPROVED: "bg-emerald-50 text-emerald",
  REJECTED: "bg-crimson-50 text-crimson",
  RECEIVED: "bg-navy-900 text-white",
  DISPUTED: "bg-crimson-50 text-crimson",
  ACTIVE: "bg-emerald-50 text-emerald",
  DRAFT: "bg-sand-50 text-slate",
  INACTIVE: "bg-sand-50 text-slate",
  NEEDS_ATTENTION: "bg-crimson-50 text-crimson",
  FLAGGED: "bg-crimson-50 text-crimson",
  PUBLISHED: "bg-emerald-50 text-emerald",
  SUSPENDED: "bg-crimson-50 text-crimson",
  PAID: "bg-emerald-50 text-emerald",
  SCHEDULED: "bg-gold-100 text-gold-text",
  COMPLETED: "bg-emerald-50 text-emerald",
  PARTIAL: "bg-gold-100 text-gold-text",
  FAILED: "bg-crimson-50 text-crimson",
  QUEUED: "bg-sand-50 text-slate",
  PROCESSING: "bg-gold-100 text-gold-text",
};

export function StatusPill({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap capitalize", TONE[status] ?? "bg-sand-50 text-slate", className)}>
      {status.replace(/_/g, " ").toLowerCase()}
    </span>
  );
}
