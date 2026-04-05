"use client";
import React, { useEffect, useState, useCallback } from "react";
import type { Event } from "../../api/getEvents/route";
import DashboardTemplate from "@/components/DashboardTemplate";
import type { EventType } from "@/app/api/getEventTypes/route";
import type { Athlete } from "@/app/api/getAthletes/route";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { confirmModal, loadingModal } from "@/components/ui/modal";
import Link from "next/link";
interface PageProps {
  params: Promise<{ id: string }>;
}

export default function MeetEventsPage({ params }: PageProps) {
  const [isPublic, setIsPublic] = useState(false);
  async function checkCredentials() {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    if (error || !data?.claims) {
      setIsPublic(true);
    }
  }

  const meetId = React.use(params).id;

  const [meetName, setMeetName] = useState("");
  const [meetDate, setMeetDate] = useState("");
  const [meetLocation, setMeetLocation] = useState("");
  const [meetNumTeams, setMeetNumTeams] = useState(0);
  const [meetSeasonId, setMeetSeasonId] = useState("");

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);

  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);

  const [rows, setRows] = useState<number[]>([0]);
  const [isRelay, setIsRelay] = useState(false);
  const [eventSelected, setEventSelected] = useState(false);
  const [relayPlaces, setRelayPlaces] = useState<Record<number, number>>({});

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/getEvents?id=${meetId}&target=meet`);
      if (!response.ok) throw new Error("Failed to fetch events");
      const data = await response.json();
      setEvents(data);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [meetId]);

  const fetchEventTypes = useCallback(async () => {
    try {
      const response = await fetch(`/api/getEventTypes`);
      if (!response.ok) throw new Error("Failed to fetch events");
      const data = await response.json();
      setEventTypes(data);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, []);

  const fetchAthletes = useCallback(async () => {
    try {
      const response = await fetch(`/api/getAthletes?season=${meetSeasonId}`);
      if (!response.ok) throw new Error("Failed to fetch athletes");
      const data = await response.json();
      setAthletes(data);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, [meetSeasonId]);

  const fetchMeet = useCallback(async () => {
    try {
      const response = await fetch(`/api/getEntity?id=${meetId}&table=meets`);
      if (!response.ok) throw new Error("Failed to get meet");
      const data = await response.json();
      setMeetName(data.name);
      setMeetDate(data.date);
      setMeetLocation(data.location);
      setMeetNumTeams(data.num_teams);
      setMeetSeasonId(data.season);

      if (meetId) {
        await fetchEvents();
      }
      if (meetSeasonId) {
        await fetchAthletes();
      }
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, [meetId, fetchAthletes, fetchEvents, meetSeasonId]);

  useEffect(() => {
    checkCredentials();
    fetchMeet();
    fetchEventTypes();
  }, [fetchEvents, fetchAthletes, fetchEventTypes, fetchMeet]);

  const groupedEvents = events.reduce((acc: Record<string, Event[]>, ev) => {
    if (!acc[ev.type]) acc[ev.type] = [];
    acc[ev.type].push(ev);
    return acc;
  }, {});

  const groupedEventsSorted = Object.fromEntries(
    Object.entries(groupedEvents).sort(([a], [b]) => a.localeCompare(b))
  );

  // Helper to convert number to ordinal string
  function toOrdinal(n: number | null | undefined): string {
    if (n === null || n === undefined || isNaN(Number(n))) return "N/A";
    const s = ["th", "st", "nd", "rd"],
      v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }
  // Helper for details display
  function detailsDisplay(details: string | null | undefined): string {
    if (!details || details === "NT") return "N/A";
    return details;
  }
  const renderGroupedItem = (type: string, eventList: Event[]) => (
    <div key={type}>
      <h3 className="text-2xl text-center font-semibold text-gray-900 dark:text-gray-100 mb-2">
        {type}
      </h3>
      <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-xl shadow mb-12">
        <div className="w-full overflow-x-auto">
          <div className="grid grid-cols-[2fr_1fr_1fr_2fr_auto] gap-2 font-semibold text-gray-700 dark:text-gray-200 px-2 py-1 border-b border-gray-300 dark:border-gray-600">
            <div>Name</div>
            <div>Place</div>
            <div>Points</div>
            <div>Details</div>
            <div className="w-5" />
          </div>
          {eventList
            .sort((a, b) => {
              const placeA = a.place ?? Infinity;
              const placeB = b.place ?? Infinity;
              return placeA - placeB;
            })
            .map((event) => (
              <div
                key={event.id}
                className="grid grid-cols-[2fr_1fr_1fr_2fr_auto] gap-2 items-center text-sm text-gray-600 dark:text-gray-400 px-2 py-1 hover:bg-gray-200/60 dark:hover:bg-gray-700/60 rounded transition"
              >
                <div>
                  <Link
                    href={`/athletes/${event.athlete.id}`}
                    className="hover:font-medium"
                  >
                    {event.athlete?.name}
                  </Link>
                </div>
                <div>{toOrdinal(event.place)}</div>
                <div>{event.points}</div>
                <div>{detailsDisplay(event.details)}</div>
                <button
                  className="text-red-500 hover:text-red-700 font-bold ml-2 hover:cursor-pointer col-span-4 md:col-span-1 md:col-start-5 justify-self-end"
                  style={{
                    gridColumn: "5",
                    justifySelf: "end",
                    display: "inline-block",
                  }}
                  onClick={async () => {
                    const confirmed = await confirmModal("Delete event?");
                    if (!confirmed) return;
                    try {
                      const response = await fetch(
                        `/api/deleteEntity?id=${event.id}&table=events`,
                        {
                          method: "DELETE",
                        }
                      );
                      if (!response.ok)
                        throw new Error("Failed to delete event");
                      fetchEvents(); // refresh events
                      toast.success("Event deleted successfully!");
                    } catch (err) {
                      toast.error(
                        err instanceof Error
                          ? err.message
                          : "Error deleting event"
                      );
                    }
                  }}
                  title="Delete event"
                >
                  ✕
                </button>
              </div>
            ))}
        </div>
      </div>
    </div>
  );

  const addForm = (
    <form
      onSubmit={async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const adding = loadingModal("Adding event...");
        const form = e.currentTarget;

        // Collect event type
        const formData = new FormData(form);
        const type = formData.get("event")?.toString() || "";

        // Collect multiple athlete/place pairs
        const athleteSelects = Array.from(
          form.querySelectorAll("select[name='athlete']")
        ) as HTMLSelectElement[];

        const placeInputs = Array.from(
          form.querySelectorAll("input[name='place']")
        ) as HTMLInputElement[];

        const detailsInputs = Array.from(
          form.querySelectorAll("input[name='details']")
        ) as HTMLInputElement[];

        const athletesArray = athleteSelects.map((s) => s.value);
        const placesArray: number[] = placeInputs.map((i) => Number(i.value));
        const detailsArray: string[] = detailsInputs.map((i) => i.value);

        const meet = meetId;
        const numTeams = meetNumTeams;

        const res = await fetch("/api/addEvents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            athletes: athletesArray,
            places: placesArray,
            meet,
            numTeams,
            details: detailsArray,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          fetchEvents();
          form.reset();
          setRows([0]);
          setRelayPlaces({});
        } else {
          toast.error(`Failed to add events: ${data.error || "Unknown error"}`);
        }
        toast.success("Events added successfully!");
        adding.close();
      }}
      className="flex flex-col gap-4 bg-gray-100 dark:bg-gray-800 p-6 rounded-xl shadow"
    >
      <label className="flex flex-col text-gray-700 dark:text-gray-200 font-medium">
        Event:
        <select
          name="event"
          required
          onChange={(e) => {
            const value = e.target.value;
            setEventSelected(!!value);

            const relayDetected = value.toLowerCase().includes("relay");
            setIsRelay(relayDetected);

            if (relayDetected) {
              setRows([0, 1, 2, 3]);
            }
          }}
          className="mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select an event...</option>
          {eventTypes.map((eventType) => (
            <option key={eventType.id} value={eventType.name}>
              {eventType.name}
            </option>
          ))}
        </select>
      </label>

      {eventSelected && (
        <div className="flex flex-col gap-3">
          {rows.map((idx) => (
            <div
              key={idx}
              className="flex flex-row gap-2 items-end bg-white/50 dark:bg-gray-700/50 p-2 rounded-lg"
            >
              <label className="flex flex-col text-gray-700 dark:text-gray-200 font-medium w-65">
                Athlete:
                <select
                  name="athlete"
                  required
                  className="mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select an athlete...</option>
                  {athletes.map((athlete) => (
                    <option key={athlete.id} value={athlete.id}>
                      {athlete.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col text-gray-700 dark:text-gray-200 font-medium w-20">
                Place:
                <input
                  name="place"
                  type="number"
                  min={-1}
                  step={1}
                  required
                  key={isRelay ? `relay-${Math.floor(idx / 4)}` : `ind-${idx}`}
                  {...(isRelay
                    ? {
                        value: relayPlaces[Math.floor(idx / 4) * 4] ?? "",
                        onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                          const teamStart = Math.floor(idx / 4) * 4;
                          const value = e.target.value;

                          setRelayPlaces((prev) => {
                            const next = { ...prev };

                            if (value === "") {
                              delete next[teamStart];
                            } else {
                              next[teamStart] = Number(value);
                            }

                            return next;
                          });
                        },
                      }
                    : {
                        defaultValue: "",
                      })}
                  className="mt-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>

              <label className="flex flex-col text-gray-700 dark:text-gray-200 font-medium w-40">
                Details:
                <input
                  name="details"
                  type="text"
                  className="mt-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>

              {!isRelay && !isPublic && rows.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setRows((prev) => prev.filter((r) => r !== idx))
                  }
                  className="text-red-500 hover:text-red-700 font-bold px-2"
                >
                  ✕
                </button>
              )}

              {isRelay && idx % 4 === 0 && rows.length > 4 && (
                <button
                  type="button"
                  onClick={() =>
                    setRows((prev) => {
                      // Remove the 4 indices that make up this relay team
                      const teamStart = idx;
                      return prev.filter(
                        (r) => r < teamStart || r >= teamStart + 4
                      );
                    })
                  }
                  className="text-red-500 hover:text-red-700 font-bold px-2"
                  title="Delete this relay team"
                >
                  ✕ Team
                </button>
              )}
            </div>
          ))}

          {!isRelay && (
            <button
              type="button"
              onClick={() =>
                setRows((prev) => [
                  ...prev,
                  prev.length ? prev[prev.length - 1] + 1 : 0,
                ])
              }
              className="bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-900 dark:text-gray-100 px-3 py-2 rounded-lg transition-colors duration-200"
            >
              + Add Another Athlete
            </button>
          )}

          {isRelay && (
            <button
              type="button"
              onClick={() =>
                setRows((prev) => {
                  const nextIndex = prev.length;
                  return [
                    ...prev,
                    nextIndex,
                    nextIndex + 1,
                    nextIndex + 2,
                    nextIndex + 3,
                  ];
                })
              }
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg transition-colors duration-200"
            >
              + Add Another Relay Team
            </button>
          )}
        </div>
      )}

      <button
        type="submit"
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
      >
        {"Add Event"}
      </button>
    </form>
  );

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const importForm = (
    <form
      onSubmit={async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!selectedFile) {
          toast.error("Please select a CSV file to import.");
          return;
        }

        const importing = loadingModal("Importing events...");

        const formData = new FormData();
        formData.append("csvFile", selectedFile);
        formData.append("meet", meetId);
        formData.append("season", meetSeasonId || "");

        try {
          const res = await fetch("/api/importEvents", {
            method: "POST",
            body: formData,
          });
          const data = await res.json();

          if (res.ok) {
            toast.success("Events imported successfully!");
            fetchEvents();
            setSelectedFile(null);
          } else {
            toast.error(data.error || "Failed to import events.");
          }
        } catch (err) {
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
        className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors duration-200
      ${
        selectedFile
          ? "border-green-500 bg-green-50 dark:bg-green-900/20"
          : dragOver
          ? "border-blue-500 bg-gray-50 dark:bg-gray-700"
          : "border-gray-400 dark:border-gray-600"
      }
    `}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length > 0)
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
                Click or drag a CSV file to upload
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Only .csv files are accepted
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
              if (e.target.files && e.target.files.length > 0)
                setSelectedFile(e.target.files[0]);
            }}
          />
        </div>
      </label>

      <button
        type="submit"
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 disabled:opacity-50 hover:cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2"
        disabled={!selectedFile}
      >
        {selectedFile ? `Import '${selectedFile.name}'` : "Import Events"}
      </button>
    </form>
  );

  const onDelete = async () => {
    await fetch(`/api/deleteEntity?id=${meetId}&table=meets`, {
      method: "DELETE",
    });
    window.location.href = "/seasons/" + meetSeasonId;
  };

  const totalPoints = events.reduce((sum, ev) => sum + ev.points, 0);
  const totalEvents = events.length;

  const athletePointsMap: Record<
    string,
    { name: string; id: string; points: number }
  > = {};

  const eventPointsMap: Record<
    string,
    { name: string; id: string; points: number }
  > = {};

  events.forEach((ev) => {
    const athleteName = ev.athlete?.name || "Unknown";
    if (!athletePointsMap[athleteName]) {
      athletePointsMap[athleteName] = {
        id: ev.athlete.id,
        name: athleteName,
        points: 0,
      };
    }
    athletePointsMap[athleteName].points += ev.points;

    const eventName = ev.type || "Unknown";
    if (!eventPointsMap[eventName]) {
      eventPointsMap[eventName] = {
        name: eventName,
        id: ev.id,
        points: 0,
      };
    }
    eventPointsMap[eventName].points += ev.points;
  });

  const topAthlete = Object.values(athletePointsMap).length
    ? Object.values(athletePointsMap).reduce((top, athlete) =>
        athlete.points > top.points ? athlete : top
      )
    : null;

  const topEvent = Object.values(eventPointsMap).length
    ? Object.values(eventPointsMap).reduce((top, event) =>
        event.points > top.points ? event : top
      )
    : null;

  const moreInfo = (
    <div className="flex gap-3 w-full">
      {totalPoints > 0 && (
        <div className="flex flex-col items-center gap-1 flex-1 bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-4">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Team Stats
          </span>
          <span className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {totalEvents} Events
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {Math.round(totalPoints)} pts{" "}
          </span>
        </div>
      )}
      {topEvent && (
        <div className="flex flex-col items-center gap-1 flex-1 bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-4">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Top Event
          </span>
          <span className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {topEvent.name}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {topEvent.points} pts
          </span>
        </div>
      )}
      {topAthlete && (
        <div className="flex flex-col items-center gap-1 flex-1 bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-4">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Top Athlete
          </span>
          <Link
            href={`/athletes/${topAthlete.id}`}
            className="text-2xl font-semibold text-gray-900 dark:text-gray-100 hover:underline text-center"
          >
            {topAthlete.name}
          </Link>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {topAthlete.points} pts
          </span>
        </div>
      )}
    </div>
  );

  return (
    <DashboardTemplate
      title={meetName ? `${meetName}` : "Meet"}
      subtitle={`${
        meetDate ? new Date(meetDate).toLocaleDateString() : ""
      } | @ ${meetLocation || ""} | ${meetNumTeams} Teams`}
      subject="Events"
      items={Object.entries(groupedEventsSorted)}
      renderItem={(entry: [string, Event[]]) =>
        renderGroupedItem(entry[0], entry[1])
      }
      addForm={addForm}
      importForm={importForm}
      loading={loading}
      onDelete={onDelete}
      isPublic={isPublic}
      moreInfo={moreInfo}
    />
  );
}
