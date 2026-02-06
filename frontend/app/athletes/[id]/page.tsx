"use client";
import React, { useEffect, useState, useCallback } from "react";
import type { Event } from "../../api/getEvents/route";
import DashboardTemplate from "@/components/DashboardTemplate";
import { useSearchParams } from "next/navigation";
import type { EventType } from "@/app/api/getEventTypes/route";
import type { Athlete } from "@/app/api/getAthletes/route";

const parseTimeToSeconds = (
  value: string | number | null | undefined
): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;

  const str = value.trim();

  // Handle DNF / DNS / empty
  if (!str || /dnf|dns/i.test(str)) return null;

  // Handle mm:ss.ms
  if (str.includes(":")) {
    const [minPart, secPart] = str.split(":");
    const minutes = Number(minPart);
    const seconds = Number(secPart);
    if (isNaN(minutes) || isNaN(seconds)) return null;
    return minutes * 60 + seconds;
  }

  // Handle plain seconds (e.g. "11.32" or "11.32s")
  const numeric = Number(str.replace(/[^\d.]/g, ""));
  return isNaN(numeric) ? null : numeric;
};

interface PageProps {
  params: { id: string };
}

export default function AthletePage({ params }: PageProps) {
  const { id } = params;
  const searchParams = useSearchParams();
  const athleteName = searchParams.get("name");

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [totalPoints, setTotalPoints] = useState<number>(0);
  const [prs, setPrs] = useState<Record<string, number>>({});
  const [deleting, setDeleting] = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/getEvents?athlete=${id}`);
      if (!response.ok) throw new Error("Failed to fetch events");
      const data = await response.json();
      setEvents(data);
      const points = data.reduce(
        (sum: number, ev: Event) => sum + (ev.points || 0),
        0
      );
      setTotalPoints(points);
      const prMap: Record<string, number> = {};
      data.forEach((ev: Event) => {
        const time = parseTimeToSeconds(
          ev.detail ?? (ev as any).result ?? "N/A"
        );
        if (time === null) return;
        if (prMap[ev.type] === undefined || time < prMap[ev.type]) {
          prMap[ev.type] = time;
        }
      });
      setPrs(prMap);
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
      const found = data.find((a: Athlete) => a.id === id);
      if (found) {
        setAthlete({
          ...found,
          name:
            found.name ||
            `${(found as any).firstName || ""} ${
              (found as any).lastName || ""
            }`.trim() ||
            "Unknown Athlete",
        });
      } else {
        setAthlete(null);
      }
    } catch (e) {
      console.error((e as Error).message);
    }
  }, [seasonId, id]);

  const handleDeleteAthlete = async () => {
    if (!athlete) return;

    const confirmed = window.confirm(
      `Are you sure you want to remove ${athlete.name} from your roster?`
    );
    if (!confirmed) return;

    try {
      setDeleting(true);
      const response = await fetch(`/api/deleteAthlete?id=${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete athlete");

      // Redirect back to roster page after deletion
      window.location.href = "/athletes";
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchAthletes();
    fetchEventTypes();
  }, [fetchEvents, fetchAthletes, fetchEventTypes]);

  const sortedEvents = [...events].sort((a, b) => {
    const ta = a.date ? new Date(a.date).getTime() : 0;
    const tb = b.date ? new Date(b.date).getTime() : 0;
    return tb - ta; // most recent first
  });

  return (
    <DashboardTemplate
      title={
        athlete ? (
          <div className="flex items-start justify-between gap-4">
            <button
              onClick={handleDeleteAthlete}
              disabled={deleting}
              className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              Remove Athlete
            </button>

            <div className="flex flex-col gap-1 text-right">
              <span className="text-2xl font-bold">
                {athlete.name} — {totalPoints} Season Points
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                PRs:{" "}
                {Object.entries(prs)
                  .map(([type, value]) =>
                    value != null ? `${type}: ${value}` : null
                  )
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </div>
          </div>
        ) : (
          "Loading..."
        )
      }
      subject="Previous Events"
      items={sortedEvents}
      renderItem={(event) => (
        <div
          key={event.id}
          className="p-4 bg-gray-100 dark:bg-gray-800 rounded-xl shadow mb-4"
        >
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {event.type} | Time:{" "}
            {event.detail ?? (event as any).result ?? "N/A"} | {event.points}{" "}
            points
          </span>
        </div>
      )}
      addForm={null}
      loading={loading}
      error={error}
    />
  );
}
