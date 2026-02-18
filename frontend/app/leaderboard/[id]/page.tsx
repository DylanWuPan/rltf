"use client";
import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import DashboardTemplate from "@/components/DashboardTemplate";
import type { Event } from "../../api/getEvents/route";

type AthleteStats = {
  athleteId: string;
  athleteName: string;
  totalPoints: number;
  numEvents: number;
  numMeets: number;
  pointsPerMeet: number;
  pointsPerEvent: number;
};

export default function LeaderboardPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const userId = params?.id ?? "";
  const filterRequest = searchParams.get("filter") ?? null;
  const athleteRequest = searchParams.get("athlete") ?? null;

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seasonFilter, setSeasonFilter] = useState<string>(
    filterRequest || "All"
  );
  const [sortOption, setSortOption] = useState<string>("totalPoints");

  const [leaderboard, setLeaderboard] = useState<AthleteStats[]>([]);
  const athleteRefs = React.useRef<Record<string, HTMLDivElement | null>>({});
  const [highlightId, setHighlightId] = useState<string | null>(athleteRequest);

  useEffect(() => {
    if (!userId) return;
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/getEvents?id=${userId}&target=user`);
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
  }, [userId]);

  useEffect(() => {
    // if (!events.length) return;
    let filteredEvents = events;
    if (seasonFilter !== "All") {
      filteredEvents = events.filter(
        (ev) => ev.meet?.season?.name === seasonFilter
      );
    }
    // Compute athlete stats
    const statsMap: Record<string, AthleteStats> = {};
    filteredEvents.forEach((ev) => {
      if (!ev.athlete) return;

      if (!statsMap[ev.athlete.id]) {
        statsMap[ev.athlete.id] = {
          athleteId: ev.athlete.id,
          athleteName: ev.athlete.name,
          totalPoints: 0,
          numEvents: 0,
          numMeets: 0,
          pointsPerMeet: 0,
          pointsPerEvent: 0,
        };
      }
      statsMap[ev.athlete.id].totalPoints += ev.points || 0;
      statsMap[ev.athlete.id].numEvents += 1;
    });
    // Compute unique meets per athlete
    const athleteMeets: Record<string, Set<string>> = {};
    filteredEvents.forEach((ev) => {
      if (!ev.athlete) return;

      if (!athleteMeets[ev.athlete.id]) {
        athleteMeets[ev.athlete.id] = new Set();
      }
      if (ev.meet?.id) {
        athleteMeets[ev.athlete.id].add(ev.meet.id);
      }
    });
    Object.keys(statsMap).forEach((athleteId) => {
      statsMap[athleteId].numMeets = athleteMeets[athleteId]?.size || 0;
    });
    // Compute derived stats
    Object.values(statsMap).forEach((stat) => {
      stat.pointsPerMeet = stat.totalPoints / Math.max(stat.numMeets, 1);
      stat.pointsPerEvent = stat.totalPoints / Math.max(stat.numEvents, 1);
    });
    // Convert to array and sort
    const sorted = Object.values(statsMap).sort((a, b) => {
      switch (sortOption) {
        case "totalPoints":
          return b.totalPoints - a.totalPoints;
        case "pointsPerMeet":
          return b.pointsPerMeet - a.pointsPerMeet;
        case "pointsPerEvent":
          return b.pointsPerEvent - a.pointsPerEvent;
        case "numMeets":
          return b.numMeets - a.numMeets;
        default:
          return 0;
      }
    });
    setLeaderboard(sorted);
  }, [events, seasonFilter, sortOption]);

  // Scroll to requested athlete and highlight on load
  useEffect(() => {
    if (!athleteRequest || leaderboard.length === 0) return;

    const el = athleteRefs.current[athleteRequest];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });

      // Remove highlight after a short delay
      const timer = setTimeout(() => {
        setHighlightId(null);
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [leaderboard, athleteRequest]);

  // Collect unique seasons for filtering (unique by season.id, display season.name)
  const seasonMap: Record<string, string> = {};

  events.forEach((ev) => {
    const seasonId = ev.meet?.season?.id;
    const seasonName = ev.meet?.season?.name;

    if (seasonId && seasonName) {
      seasonMap[seasonId] = seasonName;
    }
  });

  const seasons = Object.values(seasonMap).sort();

  const leaderboardSection = (
    <div className="flex flex-col gap-4 w-full">
      {/* Filters */}
      <div className="flex items-center justify-center gap-6 p-6 w-full">
        <div className="flex items-center gap-2 bg-white dark:bg-gray-700 px-4 py-2 rounded-lg shadow-sm border dark:border-gray-600">
          <label className="mr-2 font-semibold text-gray-700 dark:text-gray-200">
            Season:
          </label>
          <select
            value={seasonFilter}
            onChange={(e) => setSeasonFilter(e.target.value)}
            className="px-2 py-1 rounded bg-transparent text-gray-800 dark:text-gray-100 border-transparent"
          >
            <option value="All">All</option>
            {seasons.map((season) => (
              <option key={season} value={season}>
                {season}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 bg-white dark:bg-gray-700 px-4 py-2 rounded-lg shadow-sm border dark:border-gray-600">
          <label className="mr-2 font-semibold text-gray-700 dark:text-gray-200">
            Sort:
          </label>
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="px-2 py-1 rounded bg-transparent text-gray-800 dark:text-gray-100 border-transparent"
          >
            <option value="totalPoints">Total Points</option>
            <option value="pointsPerMeet">Points Per Meet (PPM)</option>
            <option value="pointsPerEvent">Points Per Event (PPE)</option>
            <option value="numMeets">Number of Meets</option>
          </select>
        </div>
      </div>

      {/* Leaderboard bubbles */}
      {leaderboard.length === 0 && !loading && (
        <div className="text-center text-gray-500 dark:text-gray-400 p-6">
          No data available.
        </div>
      )}

      {leaderboard.map((athlete, index) => {
        const rank = index + 1;
        const rankStyle = "";
        const athleteEvent = events.find(
          (ev) => ev.athlete?.id === athlete.athleteId && ev.meet?.season
        );
        const seasonId = athleteEvent?.meet?.season?.id ?? "";
        const seasonName = athleteEvent?.meet?.season?.name ?? "";
        return (
          <Link
            key={athlete.athleteId}
            href={`/athletes/${athlete.athleteId}?name=${encodeURIComponent(
              athlete.athleteName
            )}&season=${encodeURIComponent(
              seasonId
            )}&seasonName=${encodeURIComponent(seasonName)}`}
            className="block"
          >
            <div
              ref={(el) => {
                athleteRefs.current[athlete.athleteId] = el;
              }}
              className={`flex flex-col gap-2 px-5 py-4 rounded-xl shadow border bg-white dark:bg-gray-800 hover:shadow-md hover:ring-2 hover:ring-blue-400 transition cursor-pointer ${
                highlightId === athlete.athleteId
                  ? "ring-4 ring-yellow-400 animate-pulse"
                  : ""
              } ${rankStyle}`}
            >
              {/* Line 1: Rank + Name */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-lg font-bold text-gray-700 dark:text-gray-200">
                    #{rank}
                  </div>
                  <div className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    {athlete.athleteName}
                    {seasonFilter === "All" && seasonName && (
                      <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                        ({seasonName})
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                  {sortOption === "totalPoints" && `${athlete.totalPoints} pts`}
                  {sortOption === "pointsPerMeet" &&
                    `${athlete.pointsPerMeet.toFixed(2)} PPM`}
                  {sortOption === "pointsPerEvent" &&
                    `${athlete.pointsPerEvent.toFixed(2)} PPE`}
                  {sortOption === "numMeets" && `${athlete.numMeets} meets`}
                </div>
              </div>

              {/* Line 2: Stats */}
              <div className="flex flex-wrap gap-6 text-sm text-gray-700 dark:text-gray-300">
                <span>
                  <span className="font-semibold">Points:</span>{" "}
                  {athlete.totalPoints}
                </span>
                <span>
                  <span className="font-semibold">Events:</span>{" "}
                  {athlete.numEvents}
                </span>
                <span>
                  <span className="font-semibold">Meets:</span>{" "}
                  {athlete.numMeets}
                </span>
                <span>
                  <span className="font-semibold">PPM:</span>{" "}
                  {athlete.pointsPerMeet.toFixed(2)}
                </span>
                <span>
                  <span className="font-semibold">PPE:</span>{" "}
                  {athlete.pointsPerEvent.toFixed(2)}
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );

  return (
    <DashboardTemplate
      title="Athlete Leaderboard"
      subject="Athletes"
      items={leaderboard}
      loading={loading}
      error={error}
      addLink={false}
      viewLink={false}
      moreInfo={leaderboardSection}
    />
  );
}
