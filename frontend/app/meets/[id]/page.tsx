"use client";
import React, { useEffect, useState, useCallback } from "react";
import type { Event } from "../../api/getEvents/route";
import DashboardTemplate from "@/components/DashboardTemplate";
import { useSearchParams } from "next/navigation";
import type { EventType } from "@/app/api/getEventTypes/route";
import type { Athlete } from "@/app/api/getAthletes/route";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function MeetEventsPage({ params }: PageProps) {
  const { id } = React.use(params);
  const searchParams = useSearchParams();
  const meetName = searchParams.get("name");
  const seasonId = searchParams.get("season");
  const seasonName = searchParams.get("seasonName");
  const numTeams = Number(searchParams.get("num_teams"));

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);

  const [rows, setRows] = useState<number[]>([0]);
  const [isRelay, setIsRelay] = useState(false);
  const [addingEvent, setAddingEvent] = useState(false);
  const [details, setDetails] = useState("");
  const [eventSelected, setEventSelected] = useState(false);
  const [relayPlaces, setRelayPlaces] = useState<Record<number, number>>({});

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/getEvents?meet=${id}`);
      if (!response.ok) throw new Error("Failed to fetch events");
      const data = await response.json();
      setEvents(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchEventTypes = useCallback(async () => {
    try {
      const response = await fetch(`/api/getEventTypes`);
      if (!response.ok) throw new Error("Failed to fetch events");
      const data = await response.json();
      setEventTypes(data);
    } catch (e) {
      console.error((e as Error).message);
    }
  }, []);

  const fetchAthletes = useCallback(async () => {
    try {
      const response = await fetch(`/api/getAthletes?season=${seasonId}`);
      if (!response.ok) throw new Error("Failed to fetch athletes");
      const data = await response.json();
      setAthletes(data);
    } catch (e) {
      console.error((e as Error).message);
    }
  }, [seasonId]);

  useEffect(() => {
    fetchEvents();
    fetchAthletes();
    fetchEventTypes();
  }, [fetchEvents, fetchAthletes, fetchEventTypes]);

  const groupedEvents = events.reduce((acc: Record<string, Event[]>, ev) => {
    if (!acc[ev.type]) acc[ev.type] = [];
    acc[ev.type].push(ev);
    return acc;
  }, {});

  const renderGroupedItem = (type: string, eventList: Event[]) => (
    <div
      key={type}
      className="p-4 bg-gray-100 dark:bg-gray-800 rounded-xl shadow mb-4"
    >
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
        {type}
      </h3>

      <div className="flex flex-col gap-1">
        {eventList
          .sort((a, b) => a.place - b.place)
          .map((event) => (
            <div
              key={event.id}
              className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400"
            >
              <span>
                {event.athlete} |{" "}
                {(() => {
                  const place = event.place;
                  const suffix =
                    place % 100 >= 11 && place % 100 <= 13
                      ? "th"
                      : place % 10 === 1
                      ? "st"
                      : place % 10 === 2
                      ? "nd"
                      : place % 10 === 3
                      ? "rd"
                      : "th";

                  return `${place}${suffix}`;
                })()}{" "}
                Place | {event.points} points{" "}
                {event.details && `| ${event.details}`}
              </span>

              <button
                type="button"
                onClick={async () => {
                  await fetch(`/api/deleteEntity?id=${event.id}&table=events`, {
                    method: "DELETE",
                  });
                  fetchEvents();
                }}
                className="text-red-500 hover:text-red-700 font-bold px-2"
                title="Delete this entry"
              >
                ✕
              </button>
            </div>
          ))}
      </div>
    </div>
  );

  const addForm = (
    <form
      onSubmit={async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setAddingEvent(true);
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

        const meet = id;

        const res = await fetch("/api/addEventToMeet", {
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
          setError(null);
          setDetails("");
          setRelayPlaces({});
        } else {
          setError(data.error || "Failed to add event");
        }

        setAddingEvent(false);
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
            } else {
              setRows([0]);
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
                    <option key={athlete.id} value={athlete.name}>
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
                  value={
                    isRelay
                      ? relayPlaces[Math.floor(idx / 4) * 4] ?? ""
                      : undefined
                  }
                  onChange={(e) => {
                    if (isRelay) {
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
                    }
                  }}
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

              {!isRelay && rows.length > 1 && (
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
        disabled={addingEvent}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {addingEvent && (
          <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
        )}
        {addingEvent ? "Adding..." : "Add Event"}
      </button>
    </form>
  );

  const onDelete = async () => {
    await fetch(`/api/deleteEntity?id=${id}&table=meets`, {
      method: "DELETE",
    });
    window.location.href = "/seasons/" + seasonId + `?name=${seasonName}`;
  };

  return (
    <DashboardTemplate
      title={meetName ? `${meetName}` : "Meet"}
      subject="Events"
      items={Object.entries(groupedEvents)}
      renderItem={(entry) => renderGroupedItem(entry[0], entry[1])}
      addForm={addForm}
      loading={loading}
      error={error}
      onDelete={onDelete}
    />
  );
}
