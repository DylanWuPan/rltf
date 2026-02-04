import { createClient } from "https://esm.sh/@supabase/supabase-js@2.46.1";
import z from "https://esm.sh/zod@3.23.2";
import { DeleteIdSchema } from "../_shared/schemas.ts";


Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const parsedBody = DeleteIdSchema.safeParse(body);

    if (!parsedBody.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid input",
          details: parsedBody.error.format(),
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { id, table } = parsedBody.data;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // Delete the event from the events table
    const { error } = await supabase
      .from(table)
      .delete()
      .eq("id", id);

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, deletedId: id }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/* Example local invocation:

curl -X POST "https://YOURPROJECT.supabase.co/functions/v1/deleteEventFromMeet" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "id": "EVENT_UUID_HERE" }'

*/
