import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold leading-5 [&_svg]:size-3.5", {
  variants: {
    tone: {
      neutral: "bg-sand-50 text-ink border border-sand",
      navy: "bg-navy-900 text-white",
      gold: "bg-gold-100 text-gold-text",
      emerald: "bg-emerald-50 text-emerald",
      crimson: "bg-crimson-50 text-crimson",
      outline: "border border-sand text-slate",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export function Badge({ className, tone, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("rounded-[8px] border border-sand bg-white", className)} {...props} />;
}

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("skeleton", className)} aria-hidden {...props} />;
}

export function Separator({ className }: { className?: string }) {
  return <hr className={cn("border-sand", className)} />;
}

export function SectionHeading({ title, subtitle, action, className }: { title: string; subtitle?: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mb-5 flex items-end justify-between gap-4", className)}>
      <div>
        <h2 className="heading-display text-2xl md:text-[28px]">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-slate">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon, title, body, action }: { icon?: React.ReactNode; title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[8px] border border-dashed border-sand bg-white px-6 py-16 text-center">
      {icon && <div className="mb-4 grid size-14 place-items-center rounded-full bg-sand-50 text-gold-text [&_svg]:size-6">{icon}</div>}
      <h3 className="heading-display text-xl">{title}</h3>
      {body && <p className="mt-2 max-w-md text-sm text-slate">{body}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function StatCard({ label, value, hint, trend }: { label: string; value: string; hint?: string; trend?: number }) {
  return (
    <Card className="p-5">
      <p className="text-xs font-semibold tracking-wide text-slate uppercase">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-ink">{value}</p>
      {(hint || trend != null) && (
        <p className="mt-1 text-xs text-slate">
          {trend != null && <span className={cn("mr-1 font-semibold", trend >= 0 ? "text-emerald" : "text-crimson")}>{trend >= 0 ? "▲" : "▼"} {Math.abs(trend).toFixed(1)}%</span>}
          {hint}
        </p>
      )}
    </Card>
  );
}
