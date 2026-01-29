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

export const EventSchema = z.object({
  type: z.string().min(1),
  athlete: z.string().min(1),
  meet: z.string().uuid(),
  place: z.number().int().min(1),
  points: z.number().int().min(0),
});