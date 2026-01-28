import { supabaseClient } from "../_shared/supabaseClient.ts";

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const season: string | undefined = body?.season;

    if (!season) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: "Missing season field" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const { data, error } = await supabaseClient
      .from("athletes")
      .select("id, name")
      .eq("season", season)
      .order("name", { ascending: true });

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

  curl -X POST "https://yswwvmzncodhxafkzswz.supabase.co/functions/v1/getAthletesOfSeason" \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlzd3d2bXpuY29kaHhhZmt6c3d6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzODMwNDcsImV4cCI6MjA4MDk1OTA0N30.PbXFC1FLzN8oEiUCIuL7u662SteIEcsxuGff9icHZ9A' \
  -H "Content-Type: application/json" \
  -d '{"season": "58269bd3-9896-4790-a528-52ac2ba7eae3"}'    
*/