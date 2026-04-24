import { createClient } from "https://esm.sh/@supabase/supabase-js@2.46.1";
import z from "https://esm.sh/zod@3.23.2";
import { EventSchema } from "../_shared/schemas.ts";

// Schema for an array of events
const EventsArraySchema = z.array(EventSchema);

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    console.log("Received body:", body);
    const parsedBody = EventsArraySchema.safeParse(body);

    if (!parsedBody.success) {
      console.log("Zod validation errors:", parsedBody.error.format());
    } else {
      console.log("Parsed body:", parsedBody);
    }

    if (!parsedBody.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid input",
          details: parsedBody.error.format(),
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const events = parsedBody.data;

    const seen = new Map<string, typeof events[number]>();
    const duplicates: typeof events[number][] = [];

    for (const event of events) {
      const key = `${event.meet}__${event.athlete}__${event.type}`;

      if (seen.has(key)) {
        duplicates.push(event);

        console.log("🚨 DUPLICATE EVENT IN EDGE FUNCTION:");
        console.log("Key:", key);
        console.log("Existing:", seen.get(key));
        console.log("Duplicate:", event);

        continue;
      }

      seen.set(key, event);
    }

    if (duplicates.length > 0) {
      console.log(`⚠️ Found ${duplicates.length} duplicate events in request`);
    }

    console.log("FINISHED DEDUPING");

    const dedupedEvents = Array.from(seen.values());

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data, error } = await supabase
      .from("events")
      .upsert(
        events,
        { onConflict: "meet,athlete,type" },
      )
      .select();

    if (error) {
      console.error("Database error:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, events: data }),
      { status: 201, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});

/* Example curl for testing multiple events:

curl -X POST "https://yswwvmzncodhxafkzswz.supabase.co/functions/v1/addEventToMeet" \
-H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
-H "Content-Type: application/json" \
-d '[
  { "meet": "7c6d0a72-3d94-48fc-8f8f-256400de247e", "athlete": "Dylan Pan", "type": "Pole Vault", "points": 10, "place": 1 },
  { "meet": "7c6d0a72-3d94-48fc-8f8f-256400de247e", "athlete": "Jane Doe", "type": "100m", "points": 8, "place": 2 }
]'
*/
