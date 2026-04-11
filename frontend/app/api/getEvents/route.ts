import { NextResponse } from "next/server";

export type Event = {
  id: string;
  athlete: { id: string; name: string; class: string };
  type: string;
  place: number;
  points: number;
  details: string;
  created_at: string;
  meet: {
    id: string;
    name: string;
    date: string;
    location: string;
    num_teams: number;
    season: { id: string; name: string; start: string; end: string };
  };
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const target = searchParams.get("target");

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      {
        error:
          "Server misconfiguration: Missing Supabase environment variables",
      },
      { status: 500 },
    );
  }

  if (!id || !target) {
    return NextResponse.json(
      { error: "Missing id or target query parameter" },
      { status: 400 },
    );
  }
  const res = await fetch(
    `${supabaseUrl}/functions/v1/getEventsOfEntity`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ id, target }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { error: "Failed to fetch events for entity", details: text },
      { status: 500 },
    );
  }

  let json;
  try {
    json = await res.json();
  } catch (err) {
    const text = await res.text();
    return NextResponse.json(
      { error: "Supabase returned invalid JSON", details: text },
      { status: 500 },
    );
  }

  if (!json || !json.data) {
    return NextResponse.json(
      { error: "Unexpected response format from Supabase", details: json },
      { status: 500 },
    );
  }
  return NextResponse.json(json.data);
}
