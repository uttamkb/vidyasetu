import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { DISTRICT_MAP, SCHOOL_CHAINS } from "@/lib/location-data";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type"); // 'district' or 'school'
  const state = searchParams.get("state");
  const query = (searchParams.get("query") || "").toLowerCase();

  if (!type || !["district", "school"].includes(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  if (query.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  // 1. Get Master Suggestions
  let masterSuggestions: string[] = [];
  
  if (type === "district" && state && DISTRICT_MAP[state]) {
    masterSuggestions = DISTRICT_MAP[state].filter(d => 
      d.toLowerCase().includes(query)
    );
  } else if (type === "school") {
    masterSuggestions = SCHOOL_CHAINS.filter(s => 
      s.toLowerCase().includes(query)
    );
  }

  // 2. Get User-Generated Suggestions from DB
  const dbSuggestions = await prisma.user.findMany({
    where: {
      [type]: {
        contains: query,
        mode: 'insensitive',
      },
      ...(type === "district" && state ? { state } : {}),
    },
    distinct: [type as any],
    select: {
      [type]: true,
    },
    take: 10,
  });

  const userSuggestions = dbSuggestions
    .map((s: any) => s[type])
    .filter(Boolean) as string[];

  // 3. Merge and De-duplicate
  const combined = Array.from(new Set([...masterSuggestions, ...userSuggestions]));

  // Sort and limit
  const finalSuggestions = combined
    .sort((a, b) => {
      // Prioritize exact matches at the start
      const aStarts = a.toLowerCase().startsWith(query);
      const bStarts = b.toLowerCase().startsWith(query);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return a.localeCompare(b);
    })
    .slice(0, 10);

  return NextResponse.json({ suggestions: finalSuggestions });
}
