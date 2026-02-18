"use client";
import { useState, useEffect, useCallback } from "react";
import DashboardTemplate from "@/components/DashboardTemplate";
import Link from "next/link";
import { Season } from "./api/getSeasons/route";
import { createClient } from "@/lib/supabase/client";

function parseNameFromEmail(email: string): string {
  const localPart = email.split("@")[0];
  return localPart
    .split(/[._-]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function SeasonsPage() {
  const supabase = createClient();

  const [user, setUser] = useState<{ id: string; email: string } | null>(null);

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingSeason, setAddingSeason] = useState(false);

  const fetchUser = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      setUser({ id: data.user.id, email: data.user.email ?? "" });
    } else {
      setUser(null);
    }
  }, [supabase]);

  const fetchSeasons = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/getSeasons?user=${user?.id}`);
      if (!res.ok) throw new Error("Failed to fetch seasons");
      const data = await res.json();
      setSeasons(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      setError(null);
    }
  }, [user]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (user?.id) {
      fetchSeasons();
    }
  }, [user, fetchSeasons]);

  const renderItem = (season: Season) => (
    <Link
      key={season.id}
      href={{
        pathname: `/seasons/${season.id}`,
        query: { name: season.name },
      }}
      className="group relative flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-800 rounded-xl shadow hover:shadow-lg transition-shadow duration-200 cursor-pointer mb-4"
    >
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-500">
          {season.name}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {new Date(season.start).toLocaleDateString()} →{" "}
          {new Date(season.end).toLocaleDateString()}
        </p>
      </div>
      <div className="text-blue-500 group-hover:scale-110 transition-transform duration-200">
        &rarr;
      </div>
    </Link>
  );

  const addForm = (
    <form
      onSubmit={async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setAddingSeason(true);
        const form = e.currentTarget;
        const formData = new FormData(form);

        const name = formData.get("name")?.toString() || "";
        const start = new Date(
          formData.get("start")?.toString() || ""
        ).toISOString();
        const end = new Date(
          formData.get("end")?.toString() || ""
        ).toISOString();

        const res = await fetch("/api/addSeason", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, start, end, user: user?.id }),
        });

        const data = await res.json();
        if (res.ok) {
          fetchSeasons();
          form.reset();
          setError(null);
        } else {
          setError(data.error || "Failed to add season");
        }

        setAddingSeason(false);
      }}
      className="flex flex-col gap-4 bg-gray-100 dark:bg-gray-800 p-6 rounded-xl shadow"
    >
      <label className="flex flex-col text-gray-700 dark:text-gray-200 font-medium">
        Name:
        <input
          name="name"
          type="text"
          required
          className="mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </label>
      <label className="flex flex-col text-gray-700 dark:text-gray-200 font-medium">
        Start:
        <input
          name="start"
          type="date"
          required
          className="mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </label>
      <label className="flex flex-col text-gray-700 dark:text-gray-200 font-medium">
        End:
        <input
          name="end"
          type="date"
          required
          className="mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </label>
      <button
        type="submit"
        disabled={addingSeason}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {addingSeason && (
          <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
        )}
        {addingSeason ? "Adding..." : "Add Season"}
      </button>
    </form>
  );
  const links = (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => (window.location.href = `/leaderboard/${user?.id}`)}
        className="px-3 py-1 text-sm rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors inline-flex items-center gap-1"
      >
        <span className="text-xs">↗</span>
        View Team Leaderboard
      </button>
    </div>
  );

  return (
    <DashboardTemplate
      title={user ? `Welcome, ${parseNameFromEmail(user.email)}!` : "Welcome!"}
      subject="Seasons"
      items={seasons}
      renderItem={renderItem}
      addForm={addForm}
      loading={loading}
      error={error}
      hideBackButton={true}
      links={links}
    />
  );
}
