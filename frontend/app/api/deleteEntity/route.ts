import { NextResponse } from "next/server";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const table = searchParams.get("table");

    if (!id || !table) {
      return NextResponse.json(
        { error: "Missing required event id or table" },
        { status: 400 }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        {
          error:
            "Server misconfiguration: missing Supabase environment variables",
        },
        { status: 503 }
      );
    }

    // Call Supabase Edge Function: deleteEventFromMeet
    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/deleteEntityById`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          id,
          table
        }),
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json(
        { error: `Failed to delete event: ${errorText}` },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: "Unexpected server error", details: err },
      { status: 500 }
    );
  }
}