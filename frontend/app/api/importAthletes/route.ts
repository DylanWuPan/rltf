import { NextRequest, NextResponse } from "next/server";
import { parseAthletesFromCSV } from "./parse";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("csvFile") as File;
    const season = formData.get("season") as string;

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Missing or invalid file" }, {
        status: 400,
      });
    }

    if (!season) {
      return NextResponse.json({ error: "Missing season" }, { status: 400 });
    }

    if (!file.name.endsWith(".csv")) {
      return NextResponse.json({ error: "File must be a CSV" }, {
        status: 400,
      });
    }

    const csvText = await file.text();
    const { names, classes } = await parseAthletesFromCSV(csvText);

    const res = await fetch(
      `${process.env.SUPABASE_URL}/functions/v1/addAthletesToSeason`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ names, classes, season }),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: "Failed to add athletes", details: text },
        { status: 500 },
      );
    }

    const json = await res.json();
    return NextResponse.json(json?.data ?? json);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
