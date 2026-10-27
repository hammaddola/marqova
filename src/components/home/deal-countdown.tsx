"use client";

import { useEffect, useState } from "react";
import { Timer } from "lucide-react";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, "0"));
}

export function DealCountdown({ endsAt, compact }: { endsAt: string; compact?: boolean }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, []);
  if (now == null) return null;
  const left = new Date(endsAt).getTime() - now;
  if (left <= 0) return <span className="text-xs text-slate">Deal ended</span>;
  const [h, m, s] = parts(left);
  return (
    <span className={compact ? "text-xs font-semibold text-crimson" : "hidden items-center gap-1.5 rounded-full bg-crimson-50 px-3 py-1 text-xs font-semibold text-crimson sm:inline-flex"}>
      {!compact && <Timer className="size-3.5" aria-hidden />}
      Ends in <span className="tabular-nums">{h}:{m}:{s}</span>
    </span>
  );
}
