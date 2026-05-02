"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Award, Target, Flame } from "lucide-react";
import { ProgressData } from "@/types/progress";

const colorMap: Record<string, string> = {
  blue: "#3b82f6",
  green: "#22c55e",
  orange: "#f97316",
  purple: "#a855f7",
  rose: "#f43f5e",
};

export function ProgressCharts({ data }: { data: ProgressData }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-4xl font-heading font-black tracking-tight">Progress & Analytics</h1>
          <p className="text-muted-foreground text-lg mt-1">
            Track your learning journey and identify areas for improvement.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm hover:shadow-premium transition-all duration-300 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-heading font-bold text-muted-foreground uppercase tracking-wider">Overall Average</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tabular-nums">{data.overallAverage}%</div>
            <Progress value={data.overallAverage} className="mt-3 h-2" />
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-premium transition-all duration-300 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-heading font-bold text-muted-foreground uppercase tracking-wider">Assignments Done</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tabular-nums">
              {data.submittedCount}/{data.totalAssignments}
            </div>
            <Progress
              value={data.totalAssignments > 0 ? (data.submittedCount / data.totalAssignments) * 100 : 0}
              className="mt-3 h-2"
            />
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-premium transition-all duration-300 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-heading font-bold text-muted-foreground uppercase tracking-wider">Best Subject</CardTitle>
            <Award className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black tabular-nums truncate">{data.bestSubject?.name || "N/A"}</div>
            <p className="text-xs text-muted-foreground mt-2 font-medium">
              {data.bestSubject?.average || 0}% average
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-premium transition-all duration-300 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-heading font-bold text-muted-foreground uppercase tracking-wider">Focus Subject</CardTitle>
            <Flame className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black tabular-nums truncate">{data.weakestSubject?.name || "N/A"}</div>
            <p className="text-xs text-muted-foreground mt-2 font-medium">
              {data.weakestSubject?.average || 0}% avg - needs practice
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Weekly Score Chart */}
        <Card className="shadow-premium border-border/50 transition-all hover:shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-heading font-bold">Weekly Performance</CardTitle>
            <CardDescription>Your average scores over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(value) => [`${value}%`, "Score"]} />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: "#3b82f6" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Subject-wise Performance */}
        <Card className="shadow-premium border-border/50 transition-all hover:shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-heading font-bold">Subject-wise Performance</CardTitle>
            <CardDescription>Average score by subject</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.subjectData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(value) => [`${value}%`, "Average"]} />
                <Bar dataKey="average" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                  {data.subjectData.map((entry, index) => (
                    <Cell key={index} fill={colorMap[entry.color] || "#3b82f6"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="shadow-premium border-border/50 transition-all hover:shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-heading font-bold">Assignment Status</CardTitle>
            <CardDescription>Distribution of your assignment statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.statusData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-4">
              {data.statusData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm">{entry.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Subject Progress */}
        <Card className="shadow-premium border-border/50 transition-all hover:shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-heading font-bold">Subject Completion</CardTitle>
            <CardDescription>Assignments completed per subject</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.subjectData.map((subject) => (
              <div key={subject.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{subject.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {subject.completed}/{subject.total}
                  </span>
                </div>
                <Progress
                  value={subject.total > 0 ? (subject.completed / subject.total) * 100 : 0}
                  className="h-2"
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
