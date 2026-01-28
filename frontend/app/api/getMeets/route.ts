import { NextResponse } from "next/server";

export type Meet = {
  id: string;
  name: string;
  date: string;
  location: string;
  num_teams: number;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const season = searchParams.get("season");

  if (!season) {
    return NextResponse.json(
      { error: "Missing seasonId query parameter" },
      { status: 400 }
    );
  }

  // Call Supabase Edge Function
  const res = await fetch(
    `${process.env.SUPABASE_URL}/functions/v1/getMeetsOfSeason`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ season }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { error: "Failed to fetch meets", details: text },
      { status: 500 }
    );
  }

  const json = await res.json();
  return NextResponse.json(json.data);
}