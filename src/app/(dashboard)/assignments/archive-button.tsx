"use client";

import { useState, useTransition } from "react";
import { Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { archiveAssignment } from "@/app/actions/assignments";
import { toast } from "sonner";

export function ArchiveButton({ assignmentId }: { assignmentId: string }) {
  const [isPending, startTransition] = useTransition();

  const handleArchive = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!window.confirm("Are you sure you want to archive this assignment? It will be hidden from your dashboard.")) return;

    startTransition(async () => {
      try {
        await archiveAssignment(assignmentId);
        toast.success("Assignment archived");
      } catch (err) {
        toast.error("Failed to archive");
      }
    });
  };

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={handleArchive} 
      disabled={isPending}
      className="h-7 w-7 text-muted-foreground hover:text-red-500 hover:bg-red-100/50"
      title="Archive Assignment"
    >
      <Archive className="h-4 w-4" />
    </Button>
  );
}
