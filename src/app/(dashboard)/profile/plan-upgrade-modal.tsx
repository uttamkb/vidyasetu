"use client";

import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Check, Sparkles, Zap, ShieldCheck, BarChart } from "lucide-react";
import { useRouter } from "next/navigation";

export function PlanUpgradeModal({ currentPlan }: { currentPlan: string }) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/subscription", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "PRO" }),
      });

      if (res.ok) {
        setOpen(false);
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to upgrade:", error);
    } finally {
      setLoading(false);
    }
  };

  const isPro = currentPlan === "PRO";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={isPro ? "outline" : "default"} 
          className={!isPro ? "bg-amber-500 hover:bg-amber-600 shadow-premium" : ""}
        >
          {isPro ? "Manage Subscription" : "Upgrade to Pro"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-4">
            <Crown className="h-6 w-6 text-amber-600" />
          </div>
          <DialogTitle className="text-2xl text-center font-heading font-bold">
            {isPro ? "You are on Pro!" : "Upgrade to Pro"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {isPro 
              ? "Enjoy unlimited access to all AI-powered features."
              : "Unlock the full potential of your AI learning journey."
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {[
            { icon: Zap, label: "Unlimited AI Tutoring", desc: "No more daily chat limits." },
            { icon: Sparkles, label: "Smart Study Notes", desc: "AI-curated content for every topic." },
            { icon: ShieldCheck, label: "50 Assignments / day", desc: "Intensive practice mode enabled." },
            { icon: BarChart, label: "Advanced Analytics", desc: "Deep insights into mastery gaps." },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="mt-0.5 p-1 bg-white rounded-lg border shadow-sm">
                <item.icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {!isPro ? (
            <Button 
              onClick={handleUpgrade} 
              className="w-full h-12 bg-amber-500 hover:bg-amber-600 font-bold shadow-premium"
              disabled={loading}
            >
              {loading ? "Activating Pro..." : "Activate Pro — ₹499/mo"}
            </Button>
          ) : (
            <Button variant="outline" className="w-full" onClick={() => setOpen(false)}>
              Close
            </Button>
          )}
          <p className="text-[10px] text-center text-muted-foreground">
            {isPro 
              ? "Manage your billing via our support channels for now."
              : "Simulated payment. No actual money will be charged."
            }
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
