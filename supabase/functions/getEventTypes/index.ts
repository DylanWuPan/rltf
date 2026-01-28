import { supabaseClient } from "../_shared/supabaseClient.ts";

Deno.serve(async (_req) => {
  try {
    const { data, error } = await supabaseClient
      .from("event_types")
      .select("id, name")
      .order("name", { ascending: true });

    if (error) {
      console.error("Supabase error:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, eventTypes: data }),
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
