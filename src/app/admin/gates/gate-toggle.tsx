"use client";

import { useState } from "react";
import { ToggleLeft, ToggleRight } from "lucide-react";
import type { FeatureState } from "@/lib/feature-gate";

interface GateToggleProps {
  name: string;
  currentState: FeatureState;
}

export function GateToggle({ name, currentState }: GateToggleProps) {
  const [state, setState] = useState<FeatureState>(currentState);
  const states: FeatureState[] = ["OFF", "SHADOW", "ON"];
  const currentIndex = states.indexOf(state);

  const cycle = async () => {
    const nextIndex = (currentIndex + 1) % states.length;
    const nextState = states[nextIndex];

    try {
      const res = await fetch("/api/admin/feature-gates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, state: nextState }),
      });

      if (res.ok) {
        setState(nextState);
      } else {
        alert("Failed to update feature gate");
      }
    } catch {
      alert("Error updating feature gate");
    }
  };

  const icon = state === "ON" ? (
    <ToggleRight className="h-8 w-8 text-green-600" />
  ) : (
    <ToggleLeft className="h-8 w-8 text-gray-400" />
  );

  return (
    <button
      onClick={cycle}
      className="p-2 rounded-md hover:bg-muted transition-colors"
      title={`Click to cycle: ${state} → ${states[(currentIndex + 1) % states.length]}`}
    >
      {icon}
    </button>
  );
}
