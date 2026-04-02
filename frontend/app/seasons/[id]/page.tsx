"use client";
import React, { useEffect, useState, useCallback } from "react";
import type { Meet } from "../../api/getMeets/route";
import type { Athlete } from "../../api/getAthletes/route";
import Link from "next/link";
import DashboardTemplate from "@/components/DashboardTemplate";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { confirmModal, loadingModal } from "@/components/ui/modal";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function SeasonMeetsPage({ params }: PageProps) {
  const [isPublic, setIsPublic] = useState(false);
  async function checkCredentials() {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.getClaims();
    if (error || !data?.claims) {
      setIsPublic(true);
    }
  }

  const seasonId = React.use(params).id;
  const [seasonName, setSeasonName] = useState("");
  const [seasonStart, setSeasonStart] = useState("");
  const [seasonEnd, setSeasonEnd] = useState("");

  const [user, setUser] = useState<string | null>(null);
  const supabase = createClient();
  const fetchUser = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      setUser(data.user.id);
    } else {
      setUser(null);
    }
  }, [supabase]);

  const fetchSeason = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/getEntity?id=${seasonId}&table=seasons`
      );
      if (!response.ok) throw new Error("Failed to get season");
      const data = await response.json();
      setSeasonName(data.name);
      setSeasonStart(data.start);
      setSeasonEnd(data.end);
    } catch (e) {
      toast.error("Error fetching season details: " + (e as Error).message);
    }
  }, [seasonId]);

  const [meets, setMeets] = useState<Meet[]>([]);
  const [loading, setLoading] = useState(false);

  const [roster, setRoster] = useState<Athlete[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [newAthleteNames, setNewAthleteNames] = useState("");

  const fetchMeets = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/getMeets?season=${seasonId}`);
      if (!response.ok) throw new Error("Failed to fetch meets");
      const data = await response.json();
      setMeets(data);
    } catch (e) {
      toast.error("Error fetching meets: " + (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [seasonId]);

  const fetchRoster = useCallback(async () => {
    setRosterLoading(true);
    try {
      const response = await fetch(`/api/getAthletes?season=${seasonId}`);
      if (!response.ok) throw new Error("Failed to fetch athletes");
      const data = await response.json();
      setRoster(data);
    } catch (e) {
      toast.error("Error fetching roster: " + (e as Error).message);
    } finally {
      setRosterLoading(false);
    }
  }, [seasonId]);

  const addAthletes = useCallback(async () => {
    const adding = loadingModal("Adding athletes...");
    const names = (newAthleteNames || "")
      .split(/\r?\n/)
      .map((n) => n.trim())
      .filter((n) => n.length > 0);

    if (names.length === 0) {
      adding.close();
      return;
    }

    try {
      const res = await fetch("/api/addAthletes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ names, season: seasonId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to add athlete");
      }
      setNewAthleteNames("");
      fetchRoster();
      toast.success("Athletes added successfully!");
    } catch (e) {
      toast.error("Error adding athletes: " + (e as Error).message);
    }

    adding.close();
  }, [newAthleteNames, seasonId, fetchRoster]);

  useEffect(() => {
    fetchUser();
    fetchSeason();
    fetchMeets();
    fetchRoster();
    checkCredentials();
  }, [fetchUser, fetchMeets, fetchRoster, fetchSeason]);

  const renderItem = (meet: Meet) => (
    <Link
      key={meet.id}
      href={{
        pathname: `/meets/${meet.id}`,
        query: {
          name: meet.name,
          season: seasonId,
          seasonName,
          num_teams: meet.num_teams,
        },
      }}
      className="group relative flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-800 rounded-xl shadow hover:shadow-lg transition-shadow duration-200 cursor-pointer mb-4"
    >
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-500">
          {meet.name}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {new Date(meet.date).toLocaleDateString()} | @ {meet.location} |{" "}
          {meet.num_teams} Teams
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
        const addingMeet = loadingModal("Adding meet...");

        const form = e.currentTarget;
        const formData = new FormData(form);

        const name = formData.get("name")?.toString() || "";
        const date = new Date(
          formData.get("date")?.toString() || ""
        ).toISOString();
        const location = formData.get("location")?.toString() || "";
        const num_teams = Number(formData.get("num_teams")?.toString()) || "0";
        const season = seasonId;

        const res = await fetch("/api/addMeet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, date, location, num_teams, season }),
        });

        const data = await res.json();
        if (res.ok) {
          fetchMeets();
          form.reset();
          toast.success("Meet added successfully!");
        } else {
          toast.error("Error adding meet: " + (data?.error || "Unknown error"));
        }
        addingMeet.close();
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
        Date:
        <input
          name="date"
          type="date"
          required
          className="mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </label>
      <label className="flex flex-col text-gray-700 dark:text-gray-200 font-medium">
        Location:
        <input
          name="location"
          type="text"
          required
          className="mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </label>
      <label className="flex flex-col text-gray-700 dark:text-gray-200 font-medium">
        Number of Teams:
        <input
          name="num_teams"
          type="number"
          required
          className="mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </label>
      <button
        type="submit"
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
      >
        Add Meet
      </button>
    </form>
  );

  const rosterSection = (
    <div id="roster-section" className="w-full flex flex-col gap-4">
      {rosterLoading ? (
        <p className="text-center text-gray-600 dark:text-gray-400">
          Loading roster...
        </p>
      ) : roster.length === 0 ? (
        <p className="text-center text-gray-600 dark:text-gray-400">
          No athletes found.
        </p>
      ) : (
        <div className="w-full max-w-3xl mx-auto flex flex-col gap-4">
          {roster.map((athlete) => (
            <Link
              key={athlete.id}
              href={{
                pathname: `/athletes/${athlete.id}`,
                query: {
                  name: athlete.name,
                  season: seasonId,
                  seasonName,
                },
              }}
              className="group relative flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-800 rounded-xl shadow hover:shadow-lg transition-shadow duration-200 cursor-pointer"
            >
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-500">
                  {athlete.name}
                </h3>
              </div>
              <div className="text-blue-500 group-hover:scale-110 transition-transform duration-200">
                &rarr;
              </div>
            </Link>
          ))}
        </div>
      )}
      {/* Add athlete */}
      {isPublic ? null : (
        <div className="w-full max-w-3xl mx-auto">
          <div className="relative flex items-center gap-3 p-4 bg-gray-100 dark:bg-gray-800 rounded-xl shadow hover:shadow-lg transition-shadow duration-200">
            <textarea
              value={newAthleteNames}
              onChange={(e) => setNewAthleteNames(e.target.value)}
              placeholder="Paste athlete names (one per line)..."
              rows={3}
              className="w-full bg-transparent outline-none text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 resize-none"
            />
            <button
              type="submit"
              className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
              onClick={addAthletes}
            >
              Add Athletes
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const onDelete = async () => {
    await fetch(`/api/deleteEntity?id=${seasonId}&table=seasons`, {
      method: "DELETE",
    });
    window.location.href = "/";
  };

  const onBack = async () => {
    window.location.href = "/";
  };

  const links = [
    <button
      key="roster-link"
      type="button"
      onClick={() =>
        document
          .getElementById("roster-section")
          ?.scrollIntoView({ behavior: "smooth", block: "start" })
      }
      className="cursor-pointer px-3 py-1 text-sm rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors inline-flex items-center gap-1"
    >
      <span className="text-xs">↓</span>
      View Season Roster
    </button>,
    !isPublic ? (
      <button
        key="leaderboard-link"
        type="button"
        onClick={() =>
          (window.location.href = `/leaderboard/${user}?filter=${seasonName}`)
        }
        className="cursor-pointer px-3 py-1 text-sm rounded-full bg-zinc-100 dark:bg-zinc-800 border border-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors inline-flex items-center gap-1"
      >
        <span className="text-xs">↗</span>
        View Season Leaderboard
      </button>
    ) : null,
  ].filter(Boolean);

  return (
    <>
      <DashboardTemplate
        title={seasonName ?? "Season"}
        subtitle={
          seasonStart && seasonEnd
            ? `${new Date(seasonStart).toLocaleDateString()} -> ${new Date(
                seasonEnd
              ).toLocaleDateString()}`
            : undefined
        }
        subject="Meets"
        items={meets}
        renderItem={renderItem}
        addForm={addForm}
        links={links}
        loading={loading}
        onDelete={onDelete}
        onBack={onBack}
        rosterSection={rosterSection}
        isPublic={isPublic}
      />
    </>
  );
}
