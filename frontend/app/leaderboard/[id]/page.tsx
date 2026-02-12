"use client";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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
  const userId = params?.id ?? "";

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seasonFilter, setSeasonFilter] = useState<string>("All");
  const [sortOption, setSortOption] = useState<string>("totalPoints");

  const [leaderboard, setLeaderboard] = useState<AthleteStats[]>([]);

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
    if (!events.length) return;

    // Filter by season
    let filteredEvents = events;
    if (seasonFilter !== "All") {
      filteredEvents = events.filter((ev) => ev.season === seasonFilter);
    }

    // Compute athlete stats
    const statsMap: Record<string, AthleteStats> = {};
    filteredEvents.forEach((ev) => {
      if (!statsMap[ev.athlete]) {
        statsMap[ev.athlete] = {
          athleteId: ev.athlete,
          athleteName: ev.athleteName ?? "Athlete",
          totalPoints: 0,
          numEvents: 0,
          numMeets: 0,
          pointsPerMeet: 0,
          pointsPerEvent: 0,
        };
      }
      statsMap[ev.athlete].totalPoints += ev.points || 0;
      statsMap[ev.athlete].numEvents += 1;
    });

    // Compute unique meets per athlete
    const athleteMeets: Record<string, Set<string>> = {};
    filteredEvents.forEach((ev) => {
      if (!athleteMeets[ev.athlete]) {
        athleteMeets[ev.athlete] = new Set();
      }
      if (ev.meetId) {
        athleteMeets[ev.athlete].add(ev.meetId);
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

  // Collect unique seasons for filtering
  const seasons = Array.from(new Set(events.map((ev) => ev.season))).sort();

  return (
    <DashboardTemplate
      title="Leaderboard"
      subject="Athletes"
      items={leaderboard}
      renderItem={(athlete) => (
        <div
          key={athlete.athleteId}
          className="p-4 bg-gray-100 dark:bg-gray-800 rounded-xl shadow mb-4 flex justify-between"
        >
          <div>
            <span className="font-semibold">{athlete.athleteName}</span>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 space-x-4">
            <span>Total Points: {athlete.totalPoints}</span>
            <span>Events: {athlete.numEvents}</span>
            <span>Meets: {athlete.numMeets}</span>
            <span>Points/Event: {athlete.pointsPerEvent.toFixed(2)}</span>
            <span>Points/Meet: {athlete.pointsPerMeet.toFixed(2)}</span>
          </div>
        </div>
      )}
      addForm={null}
      loading={loading}
      error={error}
      moreInfo={
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div>
            <label className="mr-2 font-semibold">Season:</label>
            <select
              value={seasonFilter}
              onChange={(e) => setSeasonFilter(e.target.value)}
              className="p-1 rounded border"
            >
              <option value="All">All</option>
              {seasons.map((season) => (
                <option key={season} value={season}>
                  {season}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mr-2 font-semibold">Sort By:</label>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="p-1 rounded border"
            >
              <option value="totalPoints">Total Points</option>
              <option value="pointsPerMeet">Points per Meet</option>
              <option value="pointsPerEvent">Points per Event</option>
              <option value="numMeets">Number of Meets</option>
            </select>
          </div>
        </div>
      }
      addLink={false}
    />
  );
}
