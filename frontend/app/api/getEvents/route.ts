import { NextResponse } from "next/server";

export type Event = {
  id: string;
  athlete: string;
  type: string;
  place: number;
  points: number;
  details?: string;
  created_at?: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const target = searchParams.get("target");

  if (!id || !target) {
    return NextResponse.json(
      { error: "Missing meet query parameter" },
      { status: 400 }
    );
  }

  if (target === "meet") {
    const res = await fetch(
        `${process.env.SUPABASE_URL}/functions/v1/getEventsOfMeet`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ meet: id }),
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
  } else if (target === "athlete") {
    const res = await fetch(
      `${process.env.SUPABASE_URL}/functions/v1/getEventsOfAthlete`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ athlete: id }),
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
  } else {
    return NextResponse.json(
      { error: "Invalid target parameter" },
      { status: 400 }
    );
  }

  
}