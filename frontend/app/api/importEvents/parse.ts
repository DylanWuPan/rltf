export interface Event {
  type: string;
  athlete: string;
  place: number | null;
  details: string;
  points: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SCHOOL_CODE = "ROXB";

const EVENT_NAME_MAP: Record<string, string> = {
  "100": "100 Meters",
  "200": "200 Meters",
  "400": "400 Meters",
  "800": "800 Meters",
  "1500": "1500 Meters",
  "1600": "1600 Meters",
  "55": "55 Meters",
  "55H": "55m Hurdles",
  "110H": "110m Hurdles",
  "100H": "100m Hurdles",
  "300H": "300m Hurdles",
  "400H": "400m Hurdles",
  "3000": "3000 Meters",
  "3200": "3200 Meters",
  "4X1": "4x100 Relay",
  "4X4": "4x400 Relay",
  "HJ": "High Jump",
  "PV": "Pole Vault",
  "LJ": "Long Jump",
  "TJ": "Triple Jump",
  "SP": "Shot Put",
  "DT": "Discus",
  "JT": "Javelin",
  "HT": "Hammer",
  "WT": "Weight Throw",
};

// Relay rows reuse individual-event distances (400 = 4x100, 1600 = 4x400)
// so they need their own lookup to avoid colliding with "400 Meters" etc.
const RELAY_EVENT_NAME_MAP: Record<string, string> = {
  "400": "4x100m Relay",
  "1600": "4x400m Relay",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveEventName(raw: string, isRelay = false): string {
  const key = raw.toUpperCase();
  if (isRelay) return RELAY_EVENT_NAME_MAP[key] ?? raw;
  return EVENT_NAME_MAP[key] ?? raw;
}

function isValidResult(result: string): boolean {
  return (
    result !== "DNS" &&
    result !== "DNF" &&
    result !== "DQ" &&
    result !== "FOUL" &&
    result !== "NH" &&
    result !== "NM" &&
    result.trim() !== ""
  );
}

// ─── Parser ───────────────────────────────────────────────────────────────────

/**
 * Individual result rows (record type "E") layout:
 *
 * [0]  "E"
 * [1]  event type   – "T" (track) | "F" (field)
 * [2]  event number
 * [3]  (unused)
 * [4]  event name   – e.g. "1500", "HJ", "TJ"
 * [5]  gender
 * [6–8] (unused)
 * [9]  round        – "F" (final) | "P" (prelim)
 * [10] result       – time or distance string
 * [11] result unit
 * [12] (unused)
 * [13] overall place
 * [14] heat place
 * [15] heat number
 * [16] (unused)
 * [17] points
 * [18–21] (unused)
 * [22] last name
 * [23] first name
 * [27] school code  – e.g. "ROXB"
 *
 * ---
 *
 * Relay rows (record type "R") layout:
 *
 * [0]  "R"
 * [1]  team name    – e.g. "Roxbury Latin School 'A'"
 * [2]  event number
 * [4]  event name   – e.g. "1600", "400"
 * [5]  gender
 * [9]  round        – "F" | "P"
 * [10] team time
 * [12] school code  – e.g. "ROXB"
 * [13] overall place
 * [17] points
 * [18+] repeating athlete blocks, each 9 cols wide:
 *       lastName ; firstName ; suffix ; gender ; (empty) ; 0 ; grade ; 0 ; athleteID
 */
export function parseResults(csvBuffer: Buffer): Event[] {
  const raw = csvBuffer.toString("utf-8");
  const lines = raw.split(/\r?\n/).filter(Boolean);

  const results: Event[] = [];

  for (const line of lines) {
    const cols = line.split(";");
    const recordType = cols[0];

    if (recordType !== "E" && recordType !== "R") continue;

    // Skip prelim rounds, keep only finals
    if (cols[9]?.trim() === "P") continue;

    if (recordType === "R") {
      // School code is at col [12] for relay rows
      if (cols[12]?.trim() !== SCHOOL_CODE) continue;

      const details = cols[10]?.trim() ?? "";
      if (!isValidResult(details)) continue;

      const type = resolveEventName(cols[4]?.trim() ?? "", true);
      const rawPlace = cols[13]?.trim() ?? "";
      const place: number | null =
        rawPlace && rawPlace !== "0" ? parseInt(rawPlace, 10) : null;
      const totalPoints = parseFloat(cols[17]?.trim() ?? "0") || 0;

      // Athlete blocks start at col 18, each block is 9 cols wide:
      // [lastName, firstName, suffix, gender, empty, 0, grade, 0, athleteID]
      const athletes: string[] = [];
      for (let i = 18; i + 1 < cols.length; i += 9) {
        const last = cols[i]?.trim();
        const first = cols[i + 1]?.trim();
        if (!last && !first) break;
        athletes.push(`${first} ${last}`.trim());
      }

      const teamSize = athletes.length || 4;
      const pointsEach = totalPoints / teamSize;

      for (const athlete of athletes) {
        results.push({ type, athlete, place, details, points: pointsEach });
      }
    } else {
      // School code is at col [27] for individual rows
      if (cols[27]?.trim() !== SCHOOL_CODE) continue;

      const details = cols[10]?.trim() ?? "";
      if (!isValidResult(details)) continue;

      const type = resolveEventName(cols[4]?.trim() ?? "");
      const rawPlace = cols[13]?.trim() ?? "";
      const place: number | null =
        rawPlace && rawPlace !== "0" ? parseInt(rawPlace, 10) : null;
      const points = parseFloat(cols[17]?.trim() ?? "0") || 0;

      const lastName = cols[22]?.trim() ?? "";
      const firstName = cols[23]?.trim() ?? "";
      const athlete = `${firstName} ${lastName}`.trim();

      results.push({ type, athlete, place, details, points });
    }
  }

  return results;
}