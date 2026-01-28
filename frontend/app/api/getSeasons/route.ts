import { NextResponse } from "next/server";

export type Season = {
  id: string;
  name: string;
  start: string;
  end: string;
  user: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const user = searchParams.get("user");

  if (!user) {
    return NextResponse.json(
      { error: "Missing user query parameter" },
      { status: 400 }
    );
  }

  // Use POST to send JSON payload to Supabase function
  const res = await fetch(
    `${process.env.SUPABASE_URL}/functions/v1/getSeasonsOfUser`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error("Supabase function error:", text);
    return NextResponse.json(
      { error: "Failed to fetch seasons" },
      { status: 500 }
    );
  }

  const json = await res.json();
  const seasons: Season[] = json.seasons || [];

  return NextResponse.json(seasons);
}