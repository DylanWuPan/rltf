"use client";
import React, { useEffect, useState } from "react";
import { useSearchParams, useParams } from "next/navigation";
import DashboardTemplate from "@/components/DashboardTemplate";
import type { Event } from "../../api/getEvents/route";

export default function AthletePage() {
  const params = useParams();
  const id = params?.id ?? "";
  const searchParams = useSearchParams();
  const athleteName = searchParams.get("name") ?? "Athlete";

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/getEvents?id=${id}&target=athlete`);
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
  }, [id]);

  const totalPoints = events.reduce((sum, ev) => sum + (ev.points || 0), 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="h-px w-full bg-gray-300 dark:bg-gray-700" />
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
        addForm={null}
        loading={loading}
        error={error}
      />
    </div>
  );
}
