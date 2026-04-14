"use client";
import React, { useEffect, useState, useCallback } from "react";
import type { Meet } from "../../api/getMeets/route";
import type { Athlete } from "../../api/getAthletes/route";
import Link from "next/link";
import DashboardTemplate from "@/components/DashboardTemplate";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { loadingModal } from "@/components/ui/modal";

export default function SeasonsClient({ id }: { id: string }) {
  const [isPublic, setIsPublic] = useState(false);
  async function checkCredentials() {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.getClaims();
    if (error || !data?.claims) {
      setIsPublic(true);
    }
  }

  const seasonId = id;
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
  const [athleteInputs, setAthleteInputs] = useState([
    { firstName: "", lastName: "", class: "" },
  ]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

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

    const validAthletes = athleteInputs
      .map((a) => ({
        firstName: a.firstName.trim(),
        lastName: a.lastName.trim(),
        class: a.class.trim(),
      }))
      .filter((a) => a.firstName && a.lastName && a.class);

    if (validAthletes.length === 0) {
      adding.close();
      return;
    }

    try {
      const res = await fetch("/api/addAthletes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          names: validAthletes.map((a) => `${a.firstName} ${a.lastName}`),
          classes: validAthletes.map((a) => a.class),
          season: seasonId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to add athlete");
      }

      setAthleteInputs([{ firstName: "", lastName: "", class: "" }]);
      fetchRoster();
      toast.success("Athletes added successfully!");
    } catch (e) {
      toast.error("Error adding athletes: " + (e as Error).message);
    }

    adding.close();
  }, [athleteInputs, seasonId, fetchRoster]);

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
          className="mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </label>
      <label className="flex flex-col text-gray-700 dark:text-gray-200 font-medium">
        Date:
        <input
          name="date"
          type="date"
          required
          className="mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </label>
      <label className="flex flex-col text-gray-700 dark:text-gray-200 font-medium">
        Location:
        <input
          name="location"
          type="text"
          required
          className="mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </label>
      <label className="flex flex-col text-gray-700 dark:text-gray-200 font-medium">
        Number of Teams:
        <input
          name="num_teams"
          type="number"
          required
          className="mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </label>
      <button
        type="submit"
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-colors duration-200 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
      >
        Add Meet
      </button>
    </form>
  );

  const rosterSection = (
    <div id="roster-section" className="w-full flex flex-col gap-4">
      {/* Add athlete */}
      {isPublic ? null : (
        <div className="w-full max-w-3xl mx-auto flex flex-col gap-4">
          <form
            onSubmit={async (e: React.FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              if (!selectedFile) {
                toast.error("Please select a CSV file to import.");
                return;
              }

              const importing = loadingModal("Importing athletes...");

              const formData = new FormData();
              formData.append("csvFile", selectedFile);
              formData.append("season", seasonId);

              try {
                const res = await fetch("/api/importAthletes", {
                  method: "POST",
                  body: formData,
                });

                const data = await res.json();

                if (res.ok) {
                  toast.success("Athletes imported successfully!");
                  fetchRoster();
                  setSelectedFile(null);
                } else {
                  toast.error(data.error || "Failed to import athletes.");
                }
              } catch {
                toast.error("Error importing CSV file.");
                setSelectedFile(null);
              } finally {
                importing.close();
              }
            }}
            className="flex flex-col gap-4 bg-gray-100 dark:bg-gray-800 p-6 rounded-xl shadow"
          >
            <label
              htmlFor="csvFile"
              className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors duration-200 ${
                selectedFile
                  ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                  : dragOver
                  ? "border-blue-500 bg-gray-50 dark:bg-gray-700"
                  : "border-gray-400 dark:border-gray-600"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files[0])
                  setSelectedFile(e.dataTransfer.files[0]);
              }}
            >
              <div className="flex flex-col items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-12 w-12 text-gray-400 dark:text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12v8m0-8l3 3m-3-3l-3 3m6-6V4a2 2 0 00-2-2H8a2 2 0 00-2 2v4"
                  />
                </svg>
                {!selectedFile ? (
                  <>
                    <span className="text-gray-700 dark:text-gray-200 font-medium">
                      Click to upload a .csv file, or drag and drop.
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 text-center">
                      Column names should be &quot;First Name&quot;, &quot;Last
                      Name&quot;, and &quot;Class&quot;.
                    </span>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-gray-900 dark:text-gray-100 font-medium">
                      {selectedFile.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove file
                    </button>
                  </div>
                )}
                <input
                  type="file"
                  id="csvFile"
                  name="csvFile"
                  accept=".csv"
                  className="hidden"
                  key={selectedFile ? selectedFile.name : "empty"}
                  onChange={(e) => {
                    if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
                  }}
                />
              </div>
            </label>

            <button
              type="submit"
              disabled={!selectedFile}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-colors duration-200 disabled:opacity-50 hover:cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {selectedFile
                ? `Import '${selectedFile.name}'`
                : "Import Athletes"}
            </button>
          </form>
          {athleteInputs.map((athlete, index) => (
            <div
              key={index}
              className="flex gap-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-xl shadow"
            >
              <input
                type="text"
                placeholder="First Name"
                value={athlete.firstName}
                onChange={(e) => {
                  const updated = [...athleteInputs];
                  updated[index].firstName = e.target.value;
                  setAthleteInputs(updated);
                }}
                className="flex-1 px-2 py-1 rounded-xl bg-white dark:bg-gray-700"
              />
              <input
                type="text"
                placeholder="Last Name"
                value={athlete.lastName}
                onChange={(e) => {
                  const updated = [...athleteInputs];
                  updated[index].lastName = e.target.value;
                  setAthleteInputs(updated);
                }}
                className="flex-1 px-2 py-1 rounded-xl bg-white dark:bg-gray-700"
              />
              <input
                type="text"
                placeholder="Class"
                value={athlete.class}
                onChange={(e) => {
                  const updated = [...athleteInputs];
                  updated[index].class = e.target.value;
                  setAthleteInputs(updated);
                }}
                className="w-32 px-2 py-1 rounded-xl bg-white dark:bg-gray-700"
              />
            </div>
          ))}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                setAthleteInputs([
                  ...athleteInputs,
                  { firstName: "", lastName: "", class: "" },
                ])
              }
              className="bg-gray-300 dark:bg-gray-700 px-3 py-1 rounded-xl shadow cursor-pointer shadow hover:shadow-lg transition-shadow duration-200 cursor-pointer"
            >
              + Add Another
            </button>

            <button
              onClick={addAthletes}
              disabled={
                !athleteInputs.some(
                  (a) =>
                    a.firstName.trim() !== "" &&
                    a.lastName.trim() !== "" &&
                    a.class.trim() !== ""
                )
              }
              className="ml-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl cursor-pointer shadow hover:shadow-lg transition-shadow duration-200 cursor-pointer disabled:opacity-50  disabled:cursor-not-allowed"
            >
              Save Athletes
            </button>
          </div>
        </div>
      )}
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
              }}
              className="group relative flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-800 rounded-xl shadow hover:shadow-lg transition-shadow duration-200 cursor-pointer"
            >
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-500">
                  {athlete.name}
                  {athlete.class ? ` (${athlete.class})` : ""}
                </h3>
              </div>
              <div className="text-blue-500 group-hover:scale-110 transition-transform duration-200">
                &rarr;
              </div>
            </Link>
          ))}
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
