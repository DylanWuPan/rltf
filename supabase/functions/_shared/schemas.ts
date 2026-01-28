import { z } from "https://esm.sh/zod@3.23.2";

export const SeasonSchema = z.object({
  name: z.string().min(1),
  start: z.string().datetime(),
  end: z.string().datetime(),
  user: z.string().uuid(),
});

export const MeetSchema = z.object({
  name: z.string().min(1),
  date: z.string().datetime(),
  location: z.string(),
  num_teams: z.number().int().min(2),
  season: z.string().uuid(),
});

export const AthleteSchema = z.object({
  name: z.string().min(1),
  season: z.string().uuid(),
});

const MeetToSeasonSchema = z.object({
  meet: z.string().uuid(),
  season: z.string().uuid(),
});

export type MeetToSeason = z.infer<typeof MeetToSeasonSchema>;

const AthleteToSeasonSchema = z.object({
  athlete: z.string().uuid(),
  season: z.string().uuid(),
  points: z.number().int().min(0),
});

export type AthleteToSeason = z.infer<typeof AthleteToSeasonSchema>;

const AthleteToMeetSchema = z.object({
  athlete: z.string().uuid(),
  meet: z.string().uuid(),
  points: z.number().int().min(0),
  details: z.record(z.string(), z.any()),
});

export type AthleteToMeet = z.infer<typeof AthleteToMeetSchema>;