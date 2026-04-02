import { NextResponse } from "next/server";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(req: Request) {
  try {
    const { names, season } = await req.json();

    if (!names || !Array.isArray(names) || names.length === 0 || !season) {
      return NextResponse.json(
        { error: "Missing required fields: names (array) and season" },
        { status: 400 }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "Server misconfiguration: missing Supabase environment variables" },
        { status: 503 }
      );
    }

    const res = await fetch(`${SUPABASE_URL}/functions/v1/addAthletesToSeason`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({ names, season }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json(
        { error: `Failed to add athletes: ${errorText}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({ success: true, added: data.athletes });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Internal server error: ${message}` },
      { status: 500 }
    );
  }
}