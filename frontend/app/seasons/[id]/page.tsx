import SeasonsClient from "./SeasonsClient";

async function getSeason(id: string) {
  const res = await fetch(
    `${process.env.SUPABASE_URL}/functions/v1/getEntityById`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY as string,
        Authorization: `Bearer ${
          process.env.SUPABASE_SERVICE_ROLE_KEY as string
        }`,
      },
      body: JSON.stringify({ id, table: "seasons" }),
      cache: "no-store",
    }
  );

  if (!res.ok) return null;
  const data = await res.json();
  return data as { name: string } | null;
}

export async function generateMetadata({
  params,
}: {
  params: { id: string } | Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const season = await getSeason(resolvedParams.id);

  return {
    title: `RLTF | ${season?.name}` || "RLTF | Season",
    description: season ? `View results for ${season.name}` : "Season details",
  };
}

export default async function Page({
  params,
}: {
  params: { id: string } | Promise<{ id: string }>;
}) {
  const resolvedParams = await params;

  return <SeasonsClient id={resolvedParams.id} />;
}
