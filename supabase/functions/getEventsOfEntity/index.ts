import { supabaseClient } from "../_shared/supabaseClient.ts";

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const id: string | undefined = body?.id;
    const target: string | undefined = body?.target;
    console.log("Received request with body:", body);

    if (!id || !target) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: "Missing id or target field" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    if (!["athlete", "meet", "user"].includes(target)) {
      return new Response(
        JSON.stringify({ error: "Invalid target", details: "Target must be one of 'athlete', 'meet', or 'season'" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    let data;
    let error;

    if (target === "user") {
      const response = await supabaseClient
        .from("events")
        .select(`
          id,
          type,
          place,
          points,
          details,
          created_at,
          athlete:athletes(id, name),
          meet:meets!inner(
            id,
            name,
            date,
            location,
            num_teams,
            season:seasons!inner(id, name, start, end, user)
          )
        `)
        .eq("meets.season.user", id)
        .order("created_at", { ascending: true });

      data = response.data;
      error = response.error;
    } else {
      const response = await supabaseClient
        .from("events")
        .select(`
          id,
          type,
          place,
          points,
          details,
          created_at,
          athlete:athletes(id, name),
          meet:meets(
            id,
            name,
            date,
            location,
            num_teams,
            season:seasons(id, name, start, end)
          )
        `)
        .eq(target, id)
        .order("created_at", { ascending: true });

      data = response.data;
      error = response.error;
    }

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );

  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});

/* To invoke locally:

  1. Run `supabase start`
  2. Make an HTTP request:

  curl -X POST "https://yswwvmzncodhxafkzswz.supabase.co/functions/v1/getMeetsOfSeason" \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlzd3d2bXpuY29kaHhhZmt6c3d6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzODMwNDcsImV4cCI6MjA4MDk1OTA0N30.PbXFC1FLzN8oEiUCIuL7u662SteIEcsxuGff9icHZ9A' \
  -H "Content-Type: application/json" \
  -d '{"season": "58269bd3-9896-4790-a528-52ac2ba7eae3"}'    
*/