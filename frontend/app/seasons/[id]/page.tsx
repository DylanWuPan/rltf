"use client";
import React, { useEffect, useState, useCallback } from "react";
import type { Meet } from "../../api/getMeets/route";
import type { Athlete } from "../../api/getAthletes/route";
import Link from "next/link";
import DashboardTemplate from "@/components/DashboardTemplate";
import { useSearchParams } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function SeasonMeetsPage({ params }: PageProps) {
  const { id } = React.use(params);
  const searchParams = useSearchParams();
  const seasonName = searchParams.get("name");

  const [meets, setMeets] = useState<Meet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [roster, setRoster] = useState<Athlete[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [newAthleteName, setNewAthleteName] = useState("");

  const fetchMeets = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/getMeets?season=${id}`);
      if (!response.ok) throw new Error("Failed to fetch meets");
      const data = await response.json();
      setMeets(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchRoster = useCallback(async () => {
    setRosterLoading(true);
    try {
      const response = await fetch(`/api/getAthletes?season=${id}`);
      if (!response.ok) throw new Error("Failed to fetch athletes");
      const data = await response.json();
      setRoster(data);
    } catch (e) {
      setRosterError((e as Error).message);
    } finally {
      setRosterLoading(false);
    }
  }, [id]);

  const addAthlete = useCallback(async () => {
    const name = newAthleteName.trim();
    if (!name) return;

    try {
      const res = await fetch("/api/addAthlete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, season: id }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to add athlete");
      }

      setNewAthleteName("");
      setRosterError(null);
      fetchRoster();
    } catch (e) {
      setRosterError((e as Error).message);
    }
  }, [newAthleteName, id, fetchRoster]);

  useEffect(() => {
    fetchMeets();
    fetchRoster();
  }, [fetchMeets, fetchRoster]);

  const renderItem = (meet: Meet) => (
    <Link
      key={meet.id}
      href={{
        pathname: `/meets/${meet.id}`,
        query: { name: meet.name, season: id },
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
        const form = e.currentTarget;
        const formData = new FormData(form);

        const name = formData.get("name")?.toString() || "";
        const date = new Date(
          formData.get("date")?.toString() || ""
        ).toISOString();
        const location = formData.get("location")?.toString() || "";
        const num_teams = Number(formData.get("num_teams")?.toString()) || "0";
        const season = id;

        const res = await fetch("/api/addMeet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, date, location, num_teams, season }),
        });

        const data = await res.json();
        if (res.ok) {
          fetchMeets();
          form.reset();
          setError(null);
        } else {
          setError(data.error || "Failed to add meet");
        }
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
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
      >
        Add Meet
      </button>
    </form>
  );

  const rosterSection = (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-start gap-8 px-16 bg-white dark:bg-black">
        <h1 className="text-3xl font-bold">Team Roster</h1>

        {/* Error */}
        {rosterError && <p className="text-red-600 mb-2">{rosterError}</p>}

        {/* List of athletes */}
        {rosterLoading ? (
          <p>Loading roster...</p>
        ) : roster.length === 0 ? (
          <p className="text-center">No athletes found.</p>
        ) : (
          <div className="w-full flex flex-col gap-4">
            {roster.map((athlete) => (
              <div
                key={athlete.id}
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
              </div>
            ))}
          </div>
        )}

        {/* Add athlete */}
        <div className="mt-6 w-full">
          <div className="relative flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-800 rounded-xl shadow">
            <input
              value={newAthleteName}
              onChange={(e) => setNewAthleteName(e.target.value)}
              placeholder="Add new athlete..."
              className="w-full bg-transparent outline-none text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addAthlete();
                }
              }}
            />
            <button
              onClick={addAthlete}
              className="ml-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
            >
              Add
            </button>
          </div>
        </div>
      </main>
    </div>
  );

  return (
    <>
      <DashboardTemplate
        title={seasonName ?? "Season"}
        subject="Meets"
        items={meets}
        renderItem={renderItem}
        addForm={addForm}
        loading={loading}
        error={error}
      />

      {rosterSection}
    </>
  );
}
