"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import confetti from "canvas-confetti";

interface Badge {
  name: string;
  icon: string;
  description: string;
}

export function useGamification() {
  const celebrateBadge = (badge: Badge) => {
    // 1. Confetti!
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#3b82f6", "#22c55e", "#eab308", "#ef4444", "#a855f7"],
    });

    // 2. Beautiful Toast
    toast.success(`Badge Earned: ${badge.name}`, {
      description: badge.description,
      icon: <span className="text-2xl">{badge.icon}</span>,
      duration: 5000,
    });
  };

  const notifyXpGain = (amount: number, reason: string) => {
    toast(`+${amount} XP gained!`, {
      description: reason,
      icon: "✨",
    });
  };

  return { celebrateBadge, notifyXpGain };
}

/**
 * Global component that can be placed in layouts to handle
 * gamification events passed via URL params or other means.
 */
export function GamificationWatcher() {
  useEffect(() => {
    // Example: check URL for ?badge=...
    // In a real app, this might poll an "unread notifications" endpoint
  }, []);

  return null;
}
