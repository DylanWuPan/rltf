export interface Event {
  type: string;
  athlete: string;
  place: number | null;
  details: string;
  points: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

// Hy-Tek uses different school codes across meet files for the same school.
// reslt001.csv uses "ROLA", reslt002.csv uses "ROXB".
const SCHOOL_CODES = new Set(["ROXB", "ROLA"]);

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
  "4X1": "4x100m Relay",
  "4X4": "4x400m Relay",
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

function isFieldEvent(type: string): boolean {
  return /(HJ|PV|LJ|TJ|SP|DT|JT|HT|WT|High Jump|Pole Vault|Long Jump|Triple Jump|Shot Put|Discus|Javelin|Hammer|Weight)/i
    .test(type);
}

function inchesToFeetInches(inches: number): string {
  const feet = Math.floor(inches / 12);
  const remaining = inches % 12;
  const frac = remaining % 1;

  const wholeInches = Math.floor(remaining);
  const decimal = Math.round(frac * 8); // approximate 1/8ths

  let inchStr = `${wholeInches}`;
  if (decimal > 0) inchStr += ` ${decimal}/8`;

  return `${feet}' ${inchStr}"`;
}

function formatTrackTime(value: string): string {
  const num = parseFloat(value);
  if (isNaN(num)) return value;

  const minutes = Math.floor(num / 60);
  const seconds = num % 60;

  if (minutes > 0) {
    const secStr = seconds.toFixed(2).replace(/\.?0+$/, "");
    // Pad whole-seconds part to 2 digits: "6.4" → "06.4", "10.4" → "10.4"
    const [whole, frac] = secStr.split(".");
    const paddedSec = whole.padStart(2, "0") + (frac ? `.${frac}` : "");
    return `${minutes}:${paddedSec}`;
  }

  // Sub-60s: trim trailing zeros, keep at least one decimal place
  return seconds.toFixed(2).replace(/0+$/, "").replace(/\.$/, ".0");
}

function parseFeetInches(value: string): number | null {
  // Handles "12-06.00", "12-6", "12-06", "5-11.50" (feet-inches.hundredths)
  const match = value.match(/^(\d+)-(\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const feet = parseInt(match[1], 10);
  const inches = parseFloat(match[2]);
  return feet * 12 + inches;
}

function normalizeDetails(value: string, eventType: string): string {
  if (!value) return "";
  const cleaned = value.trim().replace(/\s+/g, " ");

  if (isFieldEvent(eventType)) {
    // Comma-delimited: bare integer inches (e.g. "60" = 5'0")
    // Hy-Tek: feet-inches string (e.g. "27-03.00")
    const fromFeetInches = parseFeetInches(cleaned);
    if (fromFeetInches !== null) return inchesToFeetInches(fromFeetInches);

    const num = parseFloat(cleaned);
    if (!isNaN(num)) return inchesToFeetInches(num);

    return cleaned;
  }

  // Track events:
  // Hy-Tek already formats as "11:31.91" — pass through unchanged
  if (cleaned.includes(":")) return cleaned;

  // Comma-delimited stores raw seconds as a float (e.g. "594.761")
  const num = parseFloat(cleaned);
  if (!isNaN(num)) return formatTrackTime(cleaned);

  return cleaned;
}

// ─── Format detection ─────────────────────────────────────────────────────────

/**
 * Returns true if the file uses the Hy-Tek semicolon format (reslt*.csv).
 * The tell-tale sign is that individual result rows start with "E;" and relay
 * rows start with "R;".
 */
function isHytekFormat(raw: string): boolean {
  return /^[ER];/m.test(raw);
}

// ─── Hy-Tek parser ────────────────────────────────────────────────────────────

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
 * [27] school code  – e.g. "ROXB" or "ROLA" (both = Roxbury Latin)
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
 * [12] school code  – e.g. "ROXB" or "ROLA"
 * [13] overall place
 * [17] points
 * [18+] repeating athlete blocks, each 9 cols wide:
 *       lastName ; firstName ; suffix ; gender ; (DOB or empty) ; age/0 ; grade ; 0 ; (empty or athleteID)
 *
 * Note: Hy-Tek 4.x appends a string athlete ID in the last slot of each
 * relay block; Hy-Tek 6.x leaves it empty and may include a DOB instead.
 * Both variants are 9 columns wide, so the block stride is the same.
 */
function parseHytek(lines: string[]): Event[] {
  const results: Event[] = [];

  for (const line of lines) {
    const cols = line.split(";");
    const recordType = cols[0];

    if (recordType !== "E" && recordType !== "R") continue;

    // Skip prelim rounds, keep only finals
    if (cols[9]?.trim() === "P") continue;

    if (recordType === "R") {
      // School code is at col [12] for relay rows
      if (!SCHOOL_CODES.has(cols[12]?.trim())) continue;

      const type = resolveEventName(cols[4]?.trim() ?? "", true);
      const details = normalizeDetails(cols[10] ?? "", type);

      const rawPlace = cols[13]?.trim() ?? "";
      const place: number | null = rawPlace && rawPlace !== "0"
        ? parseInt(rawPlace, 10)
        : null;
      const totalPoints = parseFloat(cols[17]?.trim() ?? "0") || 0;

      // Athlete blocks start at col 18, each block is 9 cols wide:
      // [lastName, firstName, suffix, gender, DOB/empty, age/0, grade, 0, empty/athleteID]
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
      if (!SCHOOL_CODES.has(cols[27]?.trim())) continue;

      const type = resolveEventName(cols[4]?.trim() ?? "");
      const details = normalizeDetails(cols[10] ?? "", type);
      if (!isValidResult(details)) continue;

      const rawPlace = cols[13]?.trim() ?? "";
      const place: number | null = rawPlace && rawPlace !== "0"
        ? parseInt(rawPlace, 10)
        : null;
      const points = parseFloat(cols[17]?.trim() ?? "0") || 0;

      const lastName = cols[22]?.trim() ?? "";
      const firstName = cols[23]?.trim() ?? "";
      const athlete = `${firstName} ${lastName}`.trim();

      results.push({ type, athlete, place, details, points });
    }
  }

  return results.filter((e) => e.place !== null);
}

// ─── New comma-delimited parser ───────────────────────────────────────────────

/**
 * New comma-delimited format (e.g. 4_11_26.csv).
 *
 * Individual result rows layout:
 *
 * [0]  athlete ID
 * [1]  (empty)
 * [2]  school name  – e.g. "Roxbury Latin"
 * [3]  school code  – e.g. "ROLA"
 * [4]  first name
 * [5]  last name
 * [6]  gender       – "M" | "F"
 * [7]  grade
 * [8]  DOB or empty
 * [9]  event code   – e.g. "100", "110h", "HJ"
 * [10] event name   – human-readable, e.g. "100 Meters", "110m Hurdles"
 * [11] (unused)
 * [12–14] (empty)
 * [15] result       – time or distance string
 * [16] (unused)
 * [17] (unused)
 * [18] overall place
 * [19] points
 * [20] heat number
 * [21] heat place
 * [22] round        – "F" (final) | "P" (prelim)
 *
 * Relay rows layout:
 *
 * [0]  (empty)
 * [1]  (empty)
 * [2]  school name
 * [3]  school code
 * [4]  (empty – no individual first name)
 * [5]  (empty)
 * [6]  gender
 * [7]  (empty)
 * [8]  (empty)
 * [9]  event code   – e.g. "4x100", "4x400"
 * [10] event name   – e.g. "4x100 Relay", "4x400 Relay"
 * [11] (unused)
 * [12–14] (empty)
 * [15] team time
 * [16] (unused)
 * [17] (unused)
 * [18] overall place – numeric, or "X" for exhibition
 * [19] points
 * [20] heat number
 * [21] heat place
 * [22] round        – "F"
 * [23] (empty)
 * [24] (empty)
 * [25] (empty)
 * [26] team letter  – "A", "B", "C", …
 * [26] athlete 1 first name
 * [27] athlete 1 last name
 * [28] athlete 1 ID
 * [29] (empty)
 * [30] athlete 2 first name
 * … repeating in groups of 4: [firstName, lastName, athleteID, empty]
 *
 * Detection: relay rows have an empty athlete-ID field ([0]) AND the event
 * code ([9]) starts with "4x".
 */
function parseCommaDelimited(lines: string[]): Event[] {
  const results: Event[] = [];

  for (const line of lines) {
    const cols = line.split(",");

    // Must belong to our school
    if (!SCHOOL_CODES.has(cols[3]?.trim())) continue;

    // Only finals
    const round = cols[22]?.trim();
    if (round !== "F") continue;

    const eventCode = cols[9]?.trim() ?? "";
    const isRelay = eventCode.toLowerCase().startsWith("4x");

    if (isRelay) {
      // Normalize relay name first, then use it for normalizeDetails
      const relayKey = eventCode.replace(/^4x/i, "").toUpperCase();
      let type = cols[10]?.trim() ?? eventCode;
      if (relayKey === "100") type = "4x100m Relay";
      if (relayKey === "400") type = "4x400m Relay";

      const details = normalizeDetails(cols[15] ?? "", type); // ← type now defined
      if (!isValidResult(details)) continue;
      // ... rest unchanged

      // "X" means exhibition – no scored place
      const rawPlace = cols[18]?.trim() ?? "";
      const place: number | null =
        rawPlace && rawPlace !== "0" && rawPlace !== "X"
          ? parseInt(rawPlace, 10)
          : null;

      if (isRelay) {
        if (relayKey === "100") type = "4x100m Relay";
        if (relayKey === "400") type = "4x400m Relay";
      }
      const totalPoints = parseFloat(cols[19]?.trim() ?? "0") || 0;

      // Athlete blocks start at col 26 (0-based), stride 4: [firstName, lastName, ID, empty]
      const athletes: string[] = [];
      for (let i = 26; i + 1 < cols.length; i += 4) {
        const first = cols[i]?.trim();
        const last = cols[i + 1]?.trim();
        if (!first && !last) break;
        athletes.push(`${first} ${last}`.trim());
      }

      const teamSize = athletes.length || 4;
      const pointsEach = totalPoints / teamSize;

      for (const athlete of athletes) {
        results.push({ type, athlete, place, details, points: pointsEach });
      }
    } else {
      const type = cols[10]?.trim() ?? eventCode;
      const details = normalizeDetails(cols[15] ?? "", type);
      if (!isValidResult(details)) continue;

      const rawPlace = cols[18]?.trim() ?? "";
      const place: number | null =
        rawPlace && rawPlace !== "0" && rawPlace !== "X"
          ? parseInt(rawPlace, 10)
          : null;

      // Event name is already human-readable in col [10]
      const points = parseFloat(cols[19]?.trim() ?? "0") || 0;

      const firstName = cols[4]?.trim() ?? "";
      const lastName = cols[5]?.trim() ?? "";
      const athlete = `${firstName} ${lastName}`.trim();

      results.push({ type, athlete, place, details, points });
    }
  }

  return results.filter((e) => e.place !== null);
}

// ─── Public entry point ───────────────────────────────────────────────────────

export function parseResults(csvBuffer: Buffer): Event[] {
  const raw = csvBuffer.toString("utf-8");
  const lines = raw.split(/\r?\n/).filter(Boolean);

  if (isHytekFormat(raw)) {
    return parseHytek(lines);
  }
  return parseCommaDelimited(lines);
}
