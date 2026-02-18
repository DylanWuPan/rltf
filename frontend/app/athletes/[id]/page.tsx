"use client";
import React, { useEffect, useState } from "react";
import { useSearchParams, useParams } from "next/navigation";
import Link from "next/link";
import DashboardTemplate from "@/components/DashboardTemplate";
import type { Event } from "../../api/getEvents/route";
import { createClient } from "@/lib/supabase/client";
import { useCallback } from "react";

export default function AthletePage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const athleteId = params?.id ?? "";
  const athleteName = searchParams.get("name") ?? "Athlete";
  const seasonId = searchParams.get("season") ?? "";
  const seasonName = searchParams.get("seasonName") ?? "";

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
    fetchUser();
  }, [athleteId, fetchUser]);

  const totalPoints = events.reduce((sum, ev) => sum + (ev.points || 0), 0);
  const totalEvents = events.length;
  const totalMeets = new Set(
    events.filter((e) => e.meet?.id).map((e) => e.meet!.id)
  ).size;

  const pointsPerEvent =
    totalEvents > 0 ? (totalPoints / totalEvents).toFixed(2) : "0.00";

  const pointsPerMeet =
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

  const content = (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-col gap-3 p-1 w-full">
        {/* Combined Total Stats box */}
        <div className="px-6 py-6 bg-blue-100 dark:bg-blue-800 rounded-xl shadow text-blue-800 dark:text-blue-200 w-full text-center">
          <div className="flex justify-center gap-4 w-full">
            <div className="flex flex-col items-center gap-1">
              <div className="text-5xl font-bold">{totalMeets}</div>
              <div className="font-semibold text-sm">Meets</div>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="text-5xl font-bold">{totalEvents}</div>
              <div className="font-semibold text-sm">Events</div>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="text-5xl font-bold">{totalPoints}</div>
              <div className="font-semibold text-sm">Points</div>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="text-5xl font-bold">{pointsPerEvent}</div>
              <div className="font-semibold text-sm">
                Points Per Event (PPE)
              </div>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="text-5xl font-bold">{pointsPerMeet}</div>
              <div className="font-semibold text-sm">Points Per Meet (PPM)</div>
            </div>
          </div>
        </div>

        {/* PR badges on the row below */}
        <div className="flex flex-wrap gap-3 items-center justify-center w-full">
          {uniqueEventTypes
            .filter((type) => events.some((e) => e.type === type && e.details))
            .map((type) => (
              <div
                key={`event-badge-${type}`}
                className="px-4 py-2 bg-green-100 dark:bg-green-800 rounded-xl shadow text-blue-800 dark:text-blue-200"
              >
                {type} PR: {eventPRs[type]}
              </div>
            ))}
        </div>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-6">
        Completed Events
      </h1>

      {(() => {
        // Group events by meet
        const eventsByMeet: Record<string, Event[]> = {};
        events.forEach((ev) => {
          const meetId = ev.meet?.id ?? "unknown";
          if (!eventsByMeet[meetId]) eventsByMeet[meetId] = [];
          eventsByMeet[meetId].push(ev);
        });

        // Sort meets chronologically by first event in each meet
        const sortedMeetIds = Object.keys(eventsByMeet).sort((a, b) => {
          const aDate = eventsByMeet[a][0]?.created_at
            ? new Date(eventsByMeet[a][0].created_at).getTime()
            : 0;
          const bDate = eventsByMeet[b][0]?.created_at
            ? new Date(eventsByMeet[b][0].created_at).getTime()
            : 0;
          return aDate - bDate;
        });

        return sortedMeetIds.map((meetId) => {
          const meetEvents = eventsByMeet[meetId].sort(
            (a, b) =>
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime()
          );
          const meetName = meetEvents[0]?.meet?.name ?? "Unknown Meet";

          return (
            <div key={meetId} className="flex flex-col gap-3 mb-6">
              <div className="flex justify-between items-center mb-2">
                <Link
                  href={{
                    pathname: `/meets/${meetId}`,
                    query: {
                      name: meetName,
                      season: seasonId,
                      seasonName: seasonName,
                      num_teams: meetEvents[0]?.meet?.num_teams,
                    },
                  }}
                  className="text-xl font-semibold cursor-pointer transition-all duration-200 hover:translate-x-1 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  <span className="text-s">↗ </span>
                  {meetName}
                </Link>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {meetEvents[0]?.meet?.date
                    ? new Date(meetEvents[0].meet.date).toLocaleDateString()
                    : ""}
                </div>
              </div>
              {meetEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-center justify-between p-4 rounded-xl shadow border bg-white dark:bg-gray-800 hover:shadow-md transition"
                >
                  <div className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                    {ev.type}
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-700 dark:text-gray-300 justify-end">
                    {ev.place !== undefined && (
                      <span>
                        <span className="font-semibold">Place:</span> {ev.place}
                      </span>
                    )}
                    {ev.points !== undefined && (
                      <span>
                        <span className="font-semibold">Points:</span>{" "}
                        {ev.points}
                      </span>
                    )}
                    {ev.details && (
                      <span>
                        <span className="font-semibold">Details:</span>{" "}
                        {ev.details}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          );
        });
      })()}
    </div>
  );

  const onDelete = async () => {
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
      window.location.href = "/seasons/" + seasonId + `?name=${seasonName}`;
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Failed to delete athlete");
    }
  };

  const links = [
    <button
      key="leaderboard-link"
      type="button"
      onClick={() =>
        (window.location.href = `/leaderboard/${user}?filter=${seasonName}&athlete=${athleteId}`)
      }
      className="px-3 py-1 text-sm rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors inline-flex items-center gap-1 cursor-pointer"
    >
      <span className="text-xs">↗</span>
      View Ranking
    </button>,
  ];

  return (
    <div className="flex flex-col gap-4">
      <DashboardTemplate
        title={athleteName}
        loading={loading}
        error={error}
        moreInfo={content}
        onDelete={onDelete}
        addLink={false}
        viewLink={false}
        links={links}
      />
    </div>
  );
}
