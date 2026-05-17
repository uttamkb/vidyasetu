"use client";

import { useState, useTransition } from "react";
import { Archive, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { archiveAssignment } from "@/app/actions/assignments";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function ArchiveButton({ 
  assignmentId, 
  label,
  variant = "ghost",
  size = "icon"
}: { 
  assignmentId: string;
  label?: string;
  variant?: "ghost" | "outline" | "destructive" | "default";
  size?: "icon" | "default" | "sm" | "lg";
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleArchive = (e: React.MouseEvent) => {
    e.preventDefault();
    const actionName = label ? "delete" : "archive";
    if (!window.confirm(`Are you sure you want to ${actionName} this assignment?`)) return;

    startTransition(async () => {
      try {
        await archiveAssignment(assignmentId);
        toast.success(`Assignment ${actionName}d`);
        if (label) {
          router.push("/assignments");
        }
      } catch (err) {
        toast.error(`Failed to ${actionName}`);
      }
    });
  };

  if (label) {
    return (
      <Button 
        variant={variant === "ghost" ? "destructive" : variant} 
        size={size === "icon" ? "default" : size}
        onClick={handleArchive} 
        disabled={isPending}
        className="gap-2"
      >
        <Trash2 className="h-4 w-4" />
        {label}
      </Button>
    );
  }

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
