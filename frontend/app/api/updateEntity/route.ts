import { NextResponse } from "next/server";
import { Event } from "../addEvents/route";

type RequestBody = {
  table: string;
  data: {
    athlete?: string;
    type?: string;
    place?: number;
    points?: number;
    details?: string;
    meet?: string;
  };
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(req: Request) {
  try {
    const body: RequestBody = await req.json();

    const { table, data } = body;

    if (!table || !data) {
      return NextResponse.json(
        { error: "Missing required table or data" },
        { status: 400 },
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        {
          error:
            "Server misconfiguration: missing Supabase environment variables",
        },
        { status: 503 },
      );
    }

    if (table === "events") {
      if (
        !data.athlete || !data.type || !data.place || !data.points ||
        !data.details || !data.meet
      ) {
        return NextResponse.json(
          { error: "Improper data" },
          { status: 400 },
        );
      }
      const eventToUpdate: Event = {
        athlete: data.athlete,
        type: data.type,
        place: data.place,
        points: data.points,
        details: data.details,
        meet: data.meet,
      };

      const res = await fetch(`${SUPABASE_URL}/functions/v1/addEventsToMeet`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify([eventToUpdate]),
      });

      if (!res.ok) {
        const errorText = await res.text();
        return NextResponse.json(
          { error: `Failed to add event: ${errorText}` },
          { status: res.status },
        );
      }
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Unexpected server error", details: err },
      { status: 500 },
    );
  }
}
