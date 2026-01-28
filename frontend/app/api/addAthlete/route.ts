import { NextResponse } from "next/server";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(req: Request) {
  try {
    const { name, season } = await req.json();

    if (!name || !season) {
      return NextResponse.json(
        { error: "Missing required fields: name and season" },
        { status: 400 }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "Server misconfiguration: missing Supabase environment variables" },
        { status: 503 }
      );
    }

    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/addAthleteToSeason`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: SUPABASE_SERVICE_ROLE_KEY,
        },
        body: JSON.stringify({ name, season }),
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json(
        { error: `Failed to add athlete: ${errorText}` },
        { status: res.status }
      );
    }

    const newAthlete = await res.json();
    return NextResponse.json(newAthlete);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Internal server error: ${message}` },
      { status: 500 }
    );
  }
}