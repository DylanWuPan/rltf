import { NextResponse } from "next/server";

export type Event = {
  id: string;
  athlete: {id: string, name: string};
  type: string;
  place: number;
  points: number;
  details: string;
  created_at: string;
  meet: {id: string, name: string, date: string, location: string, num_teams: number, season: {id: string, name: string, start: string, end: string}}
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const target = searchParams.get("target");

  if (!id || !target) {
    return NextResponse.json(
      { error: "Missing id or target query parameter" },
      { status: 400 }
    );
  }
  const res = await fetch(
    `${process.env.SUPABASE_URL}/functions/v1/getEventsOfEntity`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ id, target}),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { error: "Failed to fetch events for athlete", details: text },
      { status: 500 }
    );
  }

  const json = await res.json();
  return NextResponse.json(json.data);
}