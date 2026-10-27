"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "./button";
import type { ActionResult } from "@/lib/validation";

type Props = Omit<React.ComponentProps<typeof Button>, "onClick"> & {
  action: () => Promise<ActionResult<unknown>>;
  confirm?: string;
  successMessage?: string;
};

/** Runs a bound server action with a loading state and toast feedback. */
export function ActionButton({ action, confirm, successMessage, children, ...props }: Props) {
  const [pending, start] = useTransition();
  return (
    <Button
      {...props}
      loading={pending}
      onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
        start(async () => {
          const res = await action();
          if (!res.ok) toast.error(res.error);
          else if (res.message || successMessage) toast.success(res.message ?? successMessage);
        });
      }}
    >
      {children}
    </Button>
  );
}
