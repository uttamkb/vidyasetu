import { NextResponse } from "next/server";

/**
 * DEPRECATED: This manual cron route has been replaced by the native 
 * Inngest cron function `monthlySeeder` defined in `src/inngest/functions.ts`.
 * Inngest handles the scheduling automatically.
 */
export async function GET() {
  return NextResponse.json({ 
    message: "Deprecated. Cron is now managed by Inngest. See src/inngest/functions.ts." 
  });
}

