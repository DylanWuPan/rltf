"use client";
import React, { useEffect, useState, useCallback } from "react";
import type { Event } from "../../api/getEvents/route";
import Link from "next/link";
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

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);

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

  const renderItem = (event: Event) => (
    <Link
      key={event.id}
      href={`/Events/${event.id}`}
      className="group relative flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-800 rounded-xl shadow hover:shadow-lg transition-shadow duration-200 cursor-pointer mb-4"
    >
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-500">
          {event.type}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {event.athlete} |{" "}
          {event.place === 1 ? `${event.place}st` : `${event.place}th`} Place |{" "}
          {event.points} points
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

        const type = formData.get("type")?.toString() || "";
        const athlete = formData.get("athlete")?.toString() || "";
        const place = Number(formData.get("place")?.toString());
        const meet = id;

        const res = await fetch("/api/addEventToMeet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, athlete, place, meet }),
        });

        const data = await res.json();
        if (res.ok) {
          fetchEvents();
          form.reset();
          setError(null);
        } else {
          setError(data.error || "Failed to add event");
        }
      }}
      className="flex flex-col gap-4 bg-gray-100 dark:bg-gray-800 p-6 rounded-xl shadow"
    >
      <label className="flex flex-col text-gray-700 dark:text-gray-200 font-medium">
        Type:
        <select
          name="type"
          required
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

      <label className="flex flex-col text-gray-700 dark:text-gray-200 font-medium">
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

      <label className="flex flex-col text-gray-700 dark:text-gray-200 font-medium">
        Place:
        <input
          name="place"
          type="number"
          min={0}
          step={1}
          required
          className="mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </label>
      <button
        type="submit"
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
      >
        Add Event
      </button>
    </form>
  );

  return (
    <DashboardTemplate
      title={meetName ? `${meetName}` : "Meet"}
      subject="Events"
      items={events}
      renderItem={renderItem}
      addForm={addForm}
      loading={loading}
      error={error}
    />
  );
}
