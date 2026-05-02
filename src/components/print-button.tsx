"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <Button 
      variant="outline" 
      onClick={() => window.print()}
      className="gap-2 print:hidden"
    >
      <Printer className="h-4 w-4" />
      Print / Download PDF
    </Button>
  );
}
