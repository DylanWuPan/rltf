import { NextResponse } from "next/server";

export type Event = {
  id: string;
  athlete: string;
  type: string;
  place: number;
  points: number;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const meet = searchParams.get("meet");

  if (!meet) {
    return NextResponse.json(
      { error: "Missing meet query parameter" },
      { status: 400 }
    );
  }

  const res = await fetch(
    `${process.env.SUPABASE_URL}/functions/v1/getEventsOfMeet`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ meet }),
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