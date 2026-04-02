import { createClient } from "https://esm.sh/@supabase/supabase-js@2.46.1";
import z from "https://esm.sh/zod@3.23.2";

const BulkAthleteSchema = z.object({
  names: z.array(z.string().min(1)),
  season: z.string().min(1),
});

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const parsedBody = BulkAthleteSchema.safeParse(body);

    if (!parsedBody.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: parsedBody.error.format() }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const { names, season } = parsedBody.data;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const athletesToInsert = names.map((name) => ({ name: name.trim(), season }));

    const { data, error } = await supabase
      .from("athletes")
      .upsert(
        athletesToInsert,
        { onConflict: "name,season", ignoreDuplicates: true }
      )
      .select();

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, athletes: data }),
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
