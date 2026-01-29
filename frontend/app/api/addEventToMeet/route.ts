import { NextResponse } from "next/server";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(req: Request) {
  try {
    const { event, athletes, places, meet } = await req.json(); 

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "Server misconfiguration: missing Supabase environment variables" },
        { status: 503 }
      );
    }

    // CALCULATE POINTS BASED ON PLACES
    // calculatePoints(places, type, numTeams);

    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/addMeetToSeason`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ event, athletes, places, meet, points }),
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json(
        { error: `Failed to add meet: ${errorText}` },
        { status: res.status }
      );
    }

    const newSeason = await res.json();
    return NextResponse.json(newSeason);
  } catch (err) {
    return NextResponse.json(
      { error: err },
      { status: 503 }
    );
  }
}