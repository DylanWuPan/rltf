import { NextResponse } from "next/server";
import { parseResults, Event } from "./parse";
import {GET} from "@/app/api/getAthletes/route";


const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;


// ─── POST handler (Next.js App Router) ────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return new Response(
        JSON.stringify({ error: "Content-Type must be multipart/form-data" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const formData = await request.formData();
    const file = formData.get("csvFile");
    const meet = formData.get("meet");
    const season = formData.get("season");
          
    if (!(file instanceof Blob)) {
      return new Response(
        JSON.stringify({ error: "No file uploaded or invalid file" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (typeof meet !== "string" || meet.trim() === "") {
      return new Response(
        JSON.stringify({ error: "Meet is required and must be a string" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const events : Event[] = parseResults(buffer);

    
    const url = new URL(request.url);
    url.pathname = "/api/getAthletes";
    url.searchParams.set("season", String(season));

    const athleteRes = await GET(new Request(url.toString()));
    const athleteData = await athleteRes.json();

    // Normalize names and build set for deduplication
    const athleteSet = new Set<string>();
    const normalizedAthletes: { id: string; name: string }[] = [];

    for (const a of athleteData) {
      const normalizedName = a.name.replace("\t", " ").trim();
      if (!athleteSet.has(normalizedName)) {
        athleteSet.add(normalizedName);
        normalizedAthletes.push({ id: a.id, name: normalizedName });
      }
    }

    // Add any new athletes from CSV
    const newAthletes: string[] = [];
    for (const e of events) {
      const normalizedEventAthlete = e.athlete.replace("\t", " ").trim();
      if (!athleteSet.has(normalizedEventAthlete)) {
        newAthletes.push(normalizedEventAthlete);
      }
    }
    if (newAthletes.length > 0) {
      const addRes = await fetch(`${SUPABASE_URL}/functions/v1/addAthletesToSeason`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ names: newAthletes, season }),
      });

      if (!addRes.ok) {
        let errorData;
        try {
          errorData = await addRes.json();
        } catch {
          errorData = await addRes.text();
        }
        return NextResponse.json(
          { error: `Failed to add new athletes: ${errorData?.error || errorData}` },
          { status: addRes.status }
        );
      }

      const addedAthletes = await addRes.json();
      for (const a of addedAthletes) {
        const normalizedName = a.name.replace("\t", " ").trim();
        if (!athleteSet.has(normalizedName)) {
          athleteSet.add(normalizedName);
          normalizedAthletes.push({ id: a.id, name: normalizedName });
        }
      }
    } 

    // Build athlete map
    const athleteMap: Record<string, string> = {};
    for (const a of normalizedAthletes) {
      athleteMap[a.name] = a.id;
    }

    // Prepare new events
    const newEvents = events.map((e) => ({
      athlete: athleteMap[e.athlete.replace("\t", " ").trim()],
      type: e.type,
      place: e.place,
      points: e.points,
      details: e.details,
      meet,
    }));

    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/addEventsToMeet`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify(newEvents),
      }
    );

    if (!res.ok) {
      let errorData;
      try {
        errorData = await res.json();
      } catch {
        errorData = await res.text();
      }
      return NextResponse.json(
        { error: `Failed to import events: ${errorData?.error || errorData}` },
        { status: res.status }
      );
    }
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: typeof err === 'string' ? err : JSON.stringify(err, Object.getOwnPropertyNames(err)) },
      { status: 503 }
    );
  }
}