"use client";
import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import DashboardTemplate from "@/components/DashboardTemplate";
import type { Event } from "../../api/getEvents/route";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function AthletePage({ params }: PageProps) {
  const { id } = React.use(params);
  const searchParams = useSearchParams();
  const athleteName = searchParams.get("name") ?? "Athlete";

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/getEvents?id=${id}&target=athlete`);
        if (!response.ok) throw new Error("Failed to fetch events");
        const data = await response.json();
        setEvents(data);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [id]);

  return (
    <DashboardTemplate
      title={
        <div className="flex flex-col gap-3">
          <span className="text-5xl font-extrabold tracking-tight">
            {athleteName}
          </span>
          <div className="h-px w-full bg-gray-300 dark:bg-gray-700" />
        </div>
      }
      subject="Previous Events"
      items={events}
      renderItem={(event) => (
        <div
          key={event.id}
          className="p-4 bg-gray-100 dark:bg-gray-800 rounded-xl shadow mb-4"
        >
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {event.type} | {event.detail ?? "N/A"}
          </span>
        </div>
      )}
      addForm={null}
      loading={loading}
      error={error}
    />
  );
}
