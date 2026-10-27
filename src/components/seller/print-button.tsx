"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton() {
  return (
    <Button variant="navy" className="w-full print:hidden" onClick={() => window.print()}>
      <Printer /> Print label
    </Button>
  );
}
