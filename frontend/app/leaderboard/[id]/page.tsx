import LeaderboardClient from "./LeaderboardClient";

export async function generateMetadata() {
  return {
    title: "RLTF | Leaderboard",
    description: "RLTF Leaderboard ",
  };
}

export default async function Page({
  params,
}: {
  params: { id: string } | Promise<{ id: string }>;
}) {
  const resolvedParams = await params;

  return <LeaderboardClient id={resolvedParams.id} />;
}
