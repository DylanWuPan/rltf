import { NextResponse } from "next/server";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(req: Request) {
  try {
    const { type, athletes, places, meet, numTeams } = await req.json();

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "Server misconfiguration: missing Supabase environment variables" },
        { status: 503 }
      );
    }

    // CALCULATE POINTS BASED ON PLACES
    const points: Number[] = calculatePoints(places, type, numTeams);

    for (let i = 0; i < athletes.length; i++) {
      console.log(`Athlete: ${athletes[i]}, Place: ${places[i]}, Points: ${points[i]}`);

      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/addEventToMeet`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ type, athlete: athletes[i], meet, place: places[i], points: points[i] } ),
        }
      );

      if (!res.ok) {
        const errorText = await res.text();
        return NextResponse.json(
          { error: `Failed to add event: ${errorText}` },
          { status: res.status }
        );
      }

      const newEvent = await res.json();
      return NextResponse.json(newEvent);
    }
  }  catch (err) {
    return NextResponse.json(
      { error: err },
      { status: 503 }
    );
  }
}