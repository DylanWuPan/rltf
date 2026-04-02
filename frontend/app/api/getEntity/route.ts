import { NextResponse } from "next/server";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const table = searchParams.get("table");

    if (!id || !table) {
      return NextResponse.json(
        { error: "Missing required entity id or table" },
        { status: 400 }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "Server misconfiguration: missing Supabase environment variables" },
        { status: 503 }
      );
    }

    const allowedTables = ["events", "athletes", "meets", "seasons"];
    if (!allowedTables.includes(table)) {
      return NextResponse.json({ error: "Invalid table" }, { status: 400 });
    }

    const res = await fetch(`${SUPABASE_URL}/functions/v1/getEntityById`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ id, table }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json(
        { error: `Failed to fetch entity: ${errorText}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({ success: true, ...data }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: "Unexpected server error", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}