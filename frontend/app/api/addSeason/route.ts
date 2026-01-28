// frontend/app/api/addSeason/route.ts
import { NextResponse } from "next/server";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(req: Request) {
  try {
    const { name, start, end, user } = await req.json(); 
    console.log("addSeason called with:", { name, start, end, user });

    if (!name || !start || !end || !user) {
      return NextResponse.json(
        { error: "Missing name, start, end, or user" },
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
      `${SUPABASE_URL}/functions/v1/addSeasonToUser`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ name, start, end, user}),
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json(
        { error: `Failed to add season: ${errorText}` },
        { status: res.status }
      );
    }

    const newSeason = await res.json();
    return NextResponse.json(newSeason);
  } catch (err) {
    return NextResponse.json(
      { error: "addSeason API route crashed" },
      { status: 503 }
    );
  }
}