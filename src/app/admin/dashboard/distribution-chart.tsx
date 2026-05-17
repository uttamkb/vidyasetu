"use client";

import React, { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const COLORS = ["#3b82f6", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6"];

interface DistributionData {
  source: string;
  count: number;
  percentage: number;
}

export function DistributionChart() {
  const [data, setData] = useState<DistributionData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/admin/analytics/distribution");
        const json = await res.json();
        if (json.distribution) {
          setData(json.distribution);
        }
      } catch (err) {
        console.error("Failed to fetch distribution:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <Card className="border-none shadow-premium">
        <CardHeader>
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <Skeleton className="h-[200px] w-[200px] rounded-full" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="border-none shadow-premium">
        <CardHeader>
          <CardTitle>Content Distribution</CardTitle>
          <CardDescription>No questions in the bank yet.</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground">
          Seed the question bank to see analytics.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-premium overflow-hidden">
      <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
      <CardHeader>
        <CardTitle className="text-xl font-black">Strategic Distribution</CardTitle>
        <CardDescription>Current balance of academic sources in Question Bank</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="count"
                nameKey="source"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                formatter={(value: any, name: any) => [`${value} Questions`, name]}
              />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-6 space-y-3">
           {data.map((item, index) => (
             <div key={item.source} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                   <span className="text-sm font-bold">{item.source.replace("_", " ")}</span>
                </div>
                <div className="flex items-center gap-4">
                   <span className="text-xs text-muted-foreground font-medium">{item.count} Questions</span>
                   <span className="text-sm font-black">{item.percentage}%</span>
                </div>
             </div>
           ))}
        </div>
      </CardContent>
    </Card>
  );
}
