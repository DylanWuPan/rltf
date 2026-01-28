import { NextResponse } from "next/server";

export type EventType = {
  id: string;
  name: string;
};

export async function GET() {
  const res = await fetch(
    `${process.env.SUPABASE_URL}/functions/v1/getEventTypes`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      }
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
  const seasons: EventType[] = json.eventTypes || [];

  return NextResponse.json(seasons);
}