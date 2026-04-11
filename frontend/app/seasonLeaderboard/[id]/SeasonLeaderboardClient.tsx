"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import DashboardTemplate from "@/components/DashboardTemplate";
import type { Event } from "../../api/getEvents/route";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

type AthleteStats = {
  athleteId: string;
  athleteName: string;
  athleteClass: string;
  totalPoints: number;
  numEvents: number;
  numMeets: number;
  pointsPerMeet: number;
  pointsPerEvent: number;
};

export default function SeasonLeaderboardClient({ id }: { id: string }) {
  let highlightTimeout: NodeJS.Timeout | null = null;

  const highlightAthlete = (athleteId: string) => {
    setHighlightId(athleteId);
    if (highlightTimeout) clearTimeout(highlightTimeout);
    highlightTimeout = setTimeout(() => setHighlightId(null), 2500);
  };

  const [isPublic, setIsPublic] = useState(false);
  async function checkCredentials() {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.getClaims();
    if (error || !data?.claims) {
      setIsPublic(true);
    }
  }

  const searchParams = useSearchParams();
  const seasonId = id;
  const [seasonName, setSeasonName] = useState<string>("");
  const athleteRequest = searchParams.get("athlete") ?? null;

  const fetchSeason = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/getEntity?id=${seasonId}&table=seasons`
      );
      if (!response.ok) throw new Error("Failed to get season");
      const data = await response.json();
      setSeasonName(data.name);
    } catch (e) {
      toast.error("Error fetching season details: " + (e as Error).message);
    }
  }, [seasonId]);

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortOption, setSortOption] = useState<string>("totalPoints");
  const [classFilter, setClassFilter] = useState<string>("All");

  const [leaderboard, setLeaderboard] = useState<AthleteStats[]>([]);
  const athleteRefs = React.useRef<Record<string, HTMLDivElement | null>>({});
  const [highlightId, setHighlightId] = useState<string | null>(athleteRequest);

  useEffect(() => {
    checkCredentials();
    if (!seasonId) return;
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/getEvents?id=${seasonId}&target=season`
        );

        const text = await response.text();
        if (!response.ok) {
          toast.error(`Error fetching events: ${text}`);
          throw new Error("Failed to fetch events");
        }

        try {
          const data: Event[] = JSON.parse(text);
          setEvents(data);
        } catch (parseError) {
          toast.error("Error parsing server response as JSON");
          throw new Error("Server did not return valid JSON");
        }
      } catch (e) {
        toast.error(
          (e as Error).message || "An error occurred while fetching events"
        );
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
    fetchSeason();
  }, [seasonId, fetchSeason]);

  useEffect(() => {
    // Compute athlete stats
    let filteredEvents = events;
    if (classFilter !== "All") {
      filteredEvents = filteredEvents.filter(
        (ev) => ev.athlete?.class === classFilter
      );
    }
    const statsMap: Record<string, AthleteStats> = {};
    filteredEvents.forEach((ev) => {
      if (!ev.athlete) return;

      if (!statsMap[ev.athlete.id]) {
        statsMap[ev.athlete.id] = {
          athleteId: ev.athlete.id,
          athleteName: ev.athlete.name,
          athleteClass: ev.athlete.class,
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
  }, [events, sortOption, classFilter]);

  useEffect(() => {
    if (!athleteRequest) return;

    // Wait until the leaderboard DOM has updated
    const timer = setTimeout(() => {
      const el = athleteRefs.current[athleteRequest];
      if (el) {
        highlightAthlete(athleteRequest);
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 50); // 50ms delay ensures DOM is ready

    return () => clearTimeout(timer);
  }, [athleteRequest, leaderboard, sortOption, highlightAthlete]);

  // Collect unique seasons for filtering (unique by season.id, display season.name)
  const seasonMap: Record<string, string> = {};

  events.forEach((ev) => {
    const seasonId = ev.meet?.season?.id;
    const seasonName = ev.meet?.season?.name;

    if (seasonId && seasonName) {
      seasonMap[seasonId] = seasonName;
    }
  });

  const classSet = new Set<string>();
  events.forEach((ev) => {
    if (ev.athlete?.class) {
      classSet.add(ev.athlete.class);
    }
  });
  const classes = Array.from(classSet).sort();

  const leaderboardSection = (
    <div className="flex flex-col gap-4 w-full">
      {/* Filters + Sort Row */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between w-full gap-3">
        {/* Left: Class Filter */}
        <div className="flex items-center gap-2 bg-white dark:bg-gray-700 px-4 py-2 rounded-xl shadow-sm border dark:border-gray-600 w-full md:flex-1">
          <label className="font-medium text-gray-600 dark:text-gray-300 text-xs text-right uppercase whitespace-nowrap">
            Filter By Class...
          </label>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-transparent text-gray-800 dark:text-gray-100 border border-gray-300 dark:border-gray-600 text-xs flex-1 w-full"
          >
            <option value="All">All</option>
            {classes.map((cls) => (
              <option key={cls} value={cls}>
                {cls}
              </option>
            ))}
          </select>
        </div>

        {/* Right: Sort Selector */}
        <div className="flex items-center gap-2 bg-white dark:bg-gray-700 px-4 py-2 rounded-xl shadow-sm border dark:border-gray-600 w-full md:w-auto">
          <label className="font-medium text-gray-600 dark:text-gray-300 text-xs text-right uppercase whitespace-nowrap">
            Sort by...
          </label>
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-transparent text-gray-800 dark:text-gray-100 border border-gray-300 dark:border-gray-600 text-xs w-full md:w-auto"
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
              className={`flex flex-col gap-2 px-3 py-3 sm:px-5 sm:py-4 rounded-xl shadow border bg-white dark:bg-gray-800 hover:shadow-md hover:ring-2 hover:ring-blue-400 transition cursor-pointer ${
                highlightId === athlete.athleteId
                  ? "ring-4 ring-yellow-400 animate-pulse"
                  : ""
              } ${rankStyle}`}
            >
              {/* Line 1: Rank + Name */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="text-base sm:text-lg font-bold text-gray-700 dark:text-gray-200">
                    #{rank}
                  </div>
                  <div className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100 flex flex-wrap items-center gap-1 sm:gap-2">
                    {athlete.athleteName}
                    <span className="text-xs sm:text-sm font-normal text-gray-500 dark:text-gray-400">
                      {classFilter === "All"
                        ? `Class ${athlete.athleteClass}`
                        : ""}
                    </span>
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
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-x-4 gap-y-1 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
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
      subtitle={seasonName}
      subject="Athletes"
      items={leaderboard}
      loading={loading}
      moreInfo={leaderboardSection}
      isPublic={isPublic}
    />
  );
}
