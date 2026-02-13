"use client";
import React, { useEffect, useState } from "react";
import { useSearchParams, useParams } from "next/navigation";
import DashboardTemplate from "@/components/DashboardTemplate";
import type { Event } from "../../api/getEvents/route";

export default function AthletePage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const athleteId = params?.id ?? "";
  const athleteName = searchParams.get("name") ?? "Athlete";
  const seasonId = searchParams.get("season") ?? "";
  const seasonName = searchParams.get("seasonName") ?? "";

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!athleteId) return;
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/getEvents?id=${athleteId}&target=athlete`
        );
        if (!response.ok) throw new Error("Failed to fetch events");
        const data: Event[] = await response.json();
        setEvents(data);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [athleteId]);

  const totalPoints = events.reduce((sum, ev) => sum + (ev.points || 0), 0);
  const totalEvents = events.length;
  const totalMeets = new Set(
    events
      .filter((e) => e.meet?.id)
      .map((e) => e.meet!.id)
  ).size;

  const avgPointsPerEvent =
    totalEvents > 0 ? (totalPoints / totalEvents).toFixed(2) : "0.00";

  const avgPointsPerMeet =
    totalMeets > 0 ? (totalPoints / totalMeets).toFixed(2) : "0.00";

  const uniqueEventTypes = Array.from(new Set(events.map((e) => e.type)));

  const eventPRs: Record<string, string> = {};
  uniqueEventTypes.forEach((type) => {
    const eventDetails = events
      .filter((e) => e.type === type && e.details)
      .map((e) => e.details!.trim());
    if (eventDetails.length === 0) {
      eventPRs[type] = "";
      return;
    }
    if (/^\d/.test(type)) {
      // Running events: lowest time in minutes:seconds
      const timesInSeconds = eventDetails.map((d) => {
        if (d.includes(":")) {
          const [min, sec] = d.split(":").map(Number);
          return min * 60 + sec;
        }
        return parseFloat(d);
      });
      const minSeconds = Math.min(...timesInSeconds);

      // Format as m:ss.xx
      const minutes = Math.floor(minSeconds / 60);
      const seconds = minSeconds % 60;

      // Always show 2 decimal places and ensure leading zero
      const formattedSeconds = seconds.toFixed(2).padStart(5, "0");

      eventPRs[type] = `${minutes}:${formattedSeconds}`;
    } else {
      // Field events: highest distance
      const distances = eventDetails.map((d) => parseFloat(d));
      eventPRs[type] = Math.max(...distances).toString();
    }
  });

  return (
    <div className="flex flex-col gap-4">
      <DashboardTemplate
        title={athleteName}
        subject="Previous Events"
        items={events}
        renderItem={(event) => (
          <div
            key={event.id}
            className="p-4 bg-gray-100 dark:bg-gray-800 rounded-xl shadow mb-4"
          >
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {event.type} | Place: {event.place}
              {event.place === 1
                ? "st"
                : event.place === 2
                ? "nd"
                : event.place === 3
                ? "rd"
                : "th"}{" "}
              | Points: {event.points} | Details:{" "}
              {event.details != null ? event.details : "N/A"}
            </span>
          </div>
        )}
        loading={loading}
        error={error}
        moreInfo={
          <div className="flex flex-col gap-3 p-1">
            {/* Total Points on its own row */}
            <div className="px-4 py-4 bg-blue-100 dark:bg-blue-800 rounded-xl shadow text-blue-800 dark:text-blue-200 w-full flex flex-col justify-between">
              <div className="text-3xl font-bold">{totalPoints}</div>
              <div className="font-semibold">Total Points</div>
            </div>
          {/* Combined Total Stats box */}
          <div className="px-6 py-6 bg-blue-100 dark:bg-blue-800 rounded-xl shadow text-blue-800 dark:text-blue-200 w-full">
            <div className="flex justify-center gap-4 w-full">
              <div className="flex flex-col items-center gap-1">
                <div className="text-5xl font-bold">{totalPoints}</div>
                <div className="font-semibold text-sm">Total Points</div>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="text-5xl font-bold">{totalEvents}</div>
                <div className="font-semibold text-sm">Total Events</div>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="text-5xl font-bold">{totalMeets}</div>
                <div className="font-semibold text-sm">Total Meets</div>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="text-5xl font-bold">{avgPointsPerEvent}</div>
                <div className="font-semibold text-sm">Avg Points (Event)</div>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="text-5xl font-bold">{avgPointsPerMeet}</div>
                <div className="font-semibold text-sm">Avg Points (Meet)</div>
              </div>
            </div>
          </div>

            {/* PR badges on the row below */}
            <div className="flex flex-wrap gap-3">
              {uniqueEventTypes.map((type) => (
                <div
                  key={`event-badge-${type}`}
                  className="px-4 py-2 bg-blue-100 dark:bg-blue-800 rounded-xl shadow text-blue-800 dark:text-blue-200"
                >
                  {type} PR: {eventPRs[type]}
                </div>
              ))}
            </div>
          </div>
          {/* PR badges on the row below */}
          <div className="flex flex-wrap gap-3">
          {uniqueEventTypes.map((type) => (
           <div
            key={`event-badge-${type}`}
            className="px-4 py-2 bg-blue-100 dark:bg-blue-800 rounded-xl shadow text-blue-800 dark:text-blue-200 text-sm"
           >
           {type} PR: {eventPRs[type]}
            </div>
           ))}
          </div>
        </div>
        }
        onDelete={async () => {
          const confirmed = window.confirm(
            `Are you sure you want to delete ${athleteName}?`
          );
          if (!confirmed) return;

          try {
            const response = await fetch(
              `/api/deleteEntity?id=${athleteId}&table=athletes`,
              {
                method: "DELETE",
              }
            );
            if (!response.ok) throw new Error("Failed to delete athlete");
            window.location.href =
              "/seasons/" + seasonId + `?name=${seasonName}`;
          } catch (error) {
            console.error("Delete failed:", error);
            alert("Failed to delete athlete");
          }
        }}
        onBack={function () {
          window.location.href = "/seasons/" + seasonId + `?name=${seasonName}`;
        }}
      />
    </div>
  );
}
