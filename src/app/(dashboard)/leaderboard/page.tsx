"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Trophy,
  Medal,
  TrendingUp,
  TrendingDown,
  Minus,
  MapPin,
  School,
  Globe,
  Users,
  Crown,
} from "lucide-react";

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────
interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  image: string | null;
  school: string | null;
  district: string | null;
  state: string | null;
  avgScore: number;
  submissionCount: number;
  isCurrentUser: boolean;
}

interface MyRankData {
  optedIn: boolean;
  location?: { state: string | null; district: string | null; school: string | null };
  xp?: number;
  level?: string;
  ranks?: {
    weekly: {
      period: string;
      overall: RankDetail;
      state: RankDetail;
      district: RankDetail;
      school: RankDetail;
    };
    monthly: { period: string; overall: RankDetail; state: RankDetail };
    allTime: { period: string; overall: RankDetail; state: RankDetail };
  };
}

interface RankDetail {
  rank: number | null;
  totalInScope: number;
  myScore: number | null;
}

type PeriodType = "weekly" | "monthly" | "all_time";
type ScopeType = "all" | "state" | "district" | "school";

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────
function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="h-5 w-5 text-amber-400" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-slate-400" />;
  if (rank === 3) return <Medal className="h-5 w-5 text-amber-700" />;
  return <span className="text-sm font-bold text-muted-foreground w-5 text-center">{rank}</span>;
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 rounded-full bg-muted flex-1 max-w-[80px] overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-sm font-semibold tabular-nums">{score}%</span>
    </div>
  );
}

function RankCard({ label, detail, icon: Icon }: {
  label: string;
  detail: RankDetail;
  icon: React.ComponentType<{ className?: string }>;
}) {
  if (detail.rank === null) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="pt-5 text-center">
          <Icon className="h-6 w-6 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xs text-muted-foreground mt-1">No data yet</p>
        </CardContent>
      </Card>
    );
  }

  const pct = Math.round((1 - (detail.rank - 1) / Math.max(detail.totalInScope, 1)) * 100);

  return (
    <Card className="border-primary/20 shadow-sm hover:shadow-premium transition-all duration-300 hover:-translate-y-1 bg-card/60 backdrop-blur-sm">
      <CardContent className="pt-5 text-center">
        <Icon className="h-5 w-5 mx-auto mb-1 text-primary" />
        <p className="text-xs font-heading font-bold uppercase tracking-wider text-muted-foreground mb-1 truncate">{label}</p>
        <p className="text-3xl font-black tabular-nums text-primary">#{detail.rank}</p>
        <p className="text-xs text-muted-foreground">of {detail.totalInScope}</p>
        <Badge variant="outline" className="mt-2 text-xs">Top {100 - pct}%</Badge>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────
export default function LeaderboardPage() {
  const [period, setPeriod] = useState<PeriodType>("weekly");
  const [scope, setScope] = useState<ScopeType>("all");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [myRankData, setMyRankData] = useState<MyRankData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      setError(null);
      try {
        const [lbRes, myRes] = await Promise.all([
          fetch(`/api/leaderboard?period=${period}&scope=${scope}`),
          fetch("/api/leaderboard/me"),
        ]);

        if (!lbRes.ok) throw new Error("Failed to load leaderboard");
        const lbData = await lbRes.json();
        const myData = myRes.ok ? await myRes.json() : null;

        setEntries(lbData.leaderboard ?? []);
        setMyRankData(myData);
      } catch {
        setError("Could not load leaderboard. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [period, scope]);

  // Derive "my rank" summary from myRankData
  const getMyRankSummary = () => {
    if (!myRankData?.optedIn || !myRankData?.ranks) return null;
    if (period === "weekly") {
      return {
        overall: myRankData.ranks.weekly.overall,
        state: myRankData.ranks.weekly.state,
        district: myRankData.ranks.weekly.district,
        school: myRankData.ranks.weekly.school,
      };
    }
    if (period === "monthly") {
      return {
        overall: myRankData.ranks.monthly.overall,
        state: myRankData.ranks.monthly.state,
        district: null,
        school: null,
      };
    }
    return {
      overall: myRankData.ranks.allTime.overall,
      state: myRankData.ranks.allTime.state,
      district: null,
      school: null,
    };
  };

  const myRankSummary = getMyRankSummary();
  const hasLocation = myRankData?.location?.state || myRankData?.location?.school;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-4xl font-heading font-black tracking-tight flex items-center gap-3">
            <Trophy className="h-10 w-10 text-amber-400" />
            Leaderboard
          </h1>
          <p className="text-muted-foreground text-lg mt-1">
            See how you rank against students in your school, district, and state.
          </p>
        </div>
      </div>

      {/* My Rank Card */}
      {myRankData && (
        <Card className="border-none shadow-premium bg-gradient-to-br from-primary/10 via-blue-500/5 to-transparent overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-primary to-indigo-500" />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-heading font-bold">Your Rankings</CardTitle>
              {myRankData.level && (
                <Badge variant="outline" className="font-semibold">
                  {myRankData.level} · {myRankData.xp} XP
                </Badge>
              )}
            </div>
            {!myRankData.optedIn && (
              <CardDescription className="text-amber-600">
                Enable leaderboard in your profile to appear in rankings and see your position.
              </CardDescription>
            )}
          </CardHeader>
          {myRankData.optedIn && myRankSummary && (
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <RankCard label="Overall" detail={myRankSummary.overall} icon={Globe} />
                {myRankData.location?.state && (
                  <RankCard label={myRankData.location.state} detail={myRankSummary.state} icon={MapPin} />
                )}
                {myRankSummary.district && myRankData.location?.district && (
                  <RankCard label={myRankData.location.district} detail={myRankSummary.district} icon={Users} />
                )}
                {myRankSummary.school && myRankData.location?.school && (
                  <RankCard label="My School" detail={myRankSummary.school} icon={School} />
                )}
              </div>
              {!hasLocation && (
                <p className="text-xs text-muted-foreground mt-3">
                  Add your state and school in onboarding to unlock scoped rankings.
                </p>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* Period + Scope controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Tabs value={period} onValueChange={(v) => setPeriod(v as PeriodType)} className="w-full sm:w-auto">
          <TabsList>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="all_time">All‑Time</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex gap-2 flex-wrap">
          {(["all", "state", "district", "school"] as ScopeType[]).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={scope === s ? "default" : "outline"}
              onClick={() => setScope(s)}
              className="capitalize"
            >
              {s === "all" ? <><Globe className="h-3.5 w-3.5 mr-1.5" />All India</> :
               s === "state" ? <><MapPin className="h-3.5 w-3.5 mr-1.5" />State</> :
               s === "district" ? <><Users className="h-3.5 w-3.5 mr-1.5" />District</> :
               <><School className="h-3.5 w-3.5 mr-1.5" />School</>}
            </Button>
          ))}
        </div>
      </div>

      {/* Leaderboard Table */}
      <Card className="shadow-premium border-border/50 transition-all hover:shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-heading font-bold capitalize">{period.replace("_", " ")} · {scope === "all" ? "All India" : scope}</CardTitle>
          <CardDescription>Top 50 students by average score</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <p className="text-sm">{error}</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={fetchLeaderboard}>
                Retry
              </Button>
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <Trophy className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">No entries yet for this period and scope.</p>
              <p className="text-xs mt-1">Complete assignments and opt-in to appear here!</p>
            </div>
          ) : (
            <div className="divide-y">
              {entries.map((entry) => (
                <div
                  key={entry.userId}
                  className={`flex items-center gap-4 px-4 py-3 transition-colors ${
                    entry.isCurrentUser
                      ? "bg-primary/8 border-l-4 border-l-primary"
                      : "hover:bg-accent/30"
                  }`}
                >
                  {/* Rank */}
                  <div className="w-8 flex justify-center shrink-0">
                    <RankBadge rank={entry.rank} />
                  </div>

                  {/* Avatar */}
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={entry.image ?? undefined} />
                    <AvatarFallback className="text-xs font-bold">
                      {(entry.name ?? "S").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  {/* Name + meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium text-sm truncate ${entry.isCurrentUser ? "text-primary" : ""}`}>
                        {entry.isCurrentUser ? `${entry.name} (You)` : entry.name}
                      </span>
                      {entry.rank <= 3 && (
                        <Badge
                          variant="outline"
                          className={
                            entry.rank === 1
                              ? "border-amber-400 text-amber-500"
                              : entry.rank === 2
                              ? "border-slate-400 text-slate-500"
                              : "border-amber-700 text-amber-700"
                          }
                        >
                          {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : "🥉"}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {[entry.school, entry.district, entry.state].filter(Boolean).join(", ") || "—"}
                    </p>
                  </div>

                  {/* Score */}
                  <div className="shrink-0 text-right min-w-[100px]">
                    <ScoreBar score={entry.avgScore} />
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {entry.submissionCount} test{entry.submissionCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
