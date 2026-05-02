import { NextResponse } from "next/server";

export async function GET() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "No API key" }, { status: 500 });
    }
    
    const fetchRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await fetchRes.json();
    const models = data.models?.map((m: any) => m.name) || [];
    
    return NextResponse.json({ models });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
