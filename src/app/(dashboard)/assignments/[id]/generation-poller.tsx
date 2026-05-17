"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function GenerationPoller({ assignmentId }: { assignmentId: string }) {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/assignments/${assignmentId}/status`);
        const data = await res.json();
        if (data.status === "READY" || data.status === "FAILED") {
          router.refresh();
        }
      } catch (e) {
        // Silently fail polling
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [assignmentId, router]);

  return null;
}
