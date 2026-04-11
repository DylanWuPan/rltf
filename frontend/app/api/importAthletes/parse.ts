import { Readable } from "stream";
import csvParser from "csv-parser";

interface Row {
  "First Name"?: string;
  "Last Name"?: string;
  "Class"?: string;
}

export async function parseAthletesFromCSV(
  csvText: string,
): Promise<{ names: string[]; classes: string[] }> {
  return new Promise((resolve, reject) => {
    const names: string[] = [];
    const classes: string[] = [];

    const stream = Readable.from([csvText]);

    stream
      .pipe(csvParser())
      .on("data", (row: Row) => {
        const firstName = (row["First Name"] ?? "").trim();
        const lastName = (row["Last Name"] ?? "").trim();
        const athleteClass = (row["Class"] ?? "").trim();

        if (firstName && lastName && athleteClass) {
          names.push(`${firstName} ${lastName}`);
          classes.push(athleteClass);
        }
      })
      .on("end", () => {
        resolve({ names, classes });
      })
      .on("error", (error: unknown) => {
        reject(error instanceof Error ? error : new Error("CSV parse error"));
      });
  });
}
