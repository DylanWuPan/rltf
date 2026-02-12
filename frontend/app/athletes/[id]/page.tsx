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
        const response = await fetch(`/api/getEvents?id=${athleteId}&target=athlete`);
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
  const uniqueEventTypes = Array.from(new Set(events.map(e => e.type)));

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
      const minMins = Math.floor(minSeconds / 60);
      const minSecs = Math.round(minSeconds % 60);
      eventPRs[type] = `${minMins}:${minSecs.toString().padStart(2, "0")}`;
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
          <div className="flex flex-wrap gap-3 p-4">
            <div className="px-4 py-2 bg-blue-100 dark:bg-blue-800 rounded-xl shadow text-blue-800 dark:text-blue-200 font-semibold">
              Total Points: {totalPoints}
            </div>
            {uniqueEventTypes.map((type) => (
              <div
                key={`event-badge-${type}`}
                className="px-4 py-2 bg-blue-100 dark:bg-blue-800 rounded-xl shadow text-blue-800 dark:text-blue-200"
              >
                {type} PR: {eventPRs[type]}
              </div>
            ))}
          </div>
        }
        onDelete={async () => {
          const confirmed = window.confirm(`Are you sure you want to delete ${athleteName}?`);
          if (!confirmed) return;

          try {
            const response = await fetch(`/api/deleteEntity?id=${athleteId}&table=athletes`, {
              method: "DELETE",
            });
            if (!response.ok) throw new Error("Failed to delete athlete");
            window.location.href = "/seasons/" + seasonId + `?name=${seasonName}`;
          } catch (error) {
            console.error("Delete failed:", error);
            alert("Failed to delete athlete");
          }
        }}
      />
    </div>
  );
}
