import { NextResponse } from "next/server";
import { Event } from "../addEvents/route";

type RequestBody = {
  id: string;
  table: string;
  data: {
    //EVENT
    place?: number;
    points?: number;
    details?: string;

    //ATHLETE
    class?: string;
    name?: string;
    season?: string;
  };
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(req: Request) {
  try {
    const body: RequestBody = await req.json();

    const { id, table, data } = body;

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

    const res = await fetch(`${SUPABASE_URL}/functions/v1/editEntityById`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ id: id, table, data }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json(
        { error: `Failed to add event: ${errorText}` },
        { status: res.status },
      );
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Unexpected server error", details: err },
      { status: 500 },
    );
  }
}
