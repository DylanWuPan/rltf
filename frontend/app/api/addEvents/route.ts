import { NextResponse } from "next/server";
import { calculateScores } from "./scoring";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export type Event = {
  athlete: string;
  type: string;
  place: number;
  points: number;
  details: string;
  meet: string;
};

type RequestBody = {
  type: string;
  athletes: string[];
  places: number[];
  meet: string;
  numTeams: number;
  details: string[];
};

export async function POST(req: Request) {
  try {
    const body: RequestBody = await req.json();

    const { type, athletes, places, meet, numTeams, details } = body;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        {
          error:
            "Server misconfiguration: missing Supabase environment variables",
        },
        { status: 503 },
      );
    }

    if (
      !type ||
      !Array.isArray(athletes) ||
      !Array.isArray(places) ||
      !meet ||
      typeof numTeams !== "number" ||
      !Array.isArray(details) ||
      athletes.length !== places.length ||
      athletes.length !== details.length
    ) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const points: number[] = calculateScores(type, numTeams, places);

    const newEvents: Event[] = athletes.map((athlete, i) => ({
      athlete,
      type,
      place: places[i],
      points: points[i],
      details: details[i],
      meet,
    }));

    const res = await fetch(`${SUPABASE_URL}/functions/v1/addEventsToMeet`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify(newEvents),
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json(
        { error: `Failed to add event: ${errorText}` },
        { status: res.status },
      );
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 503 },
    );
  }
}
