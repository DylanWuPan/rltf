export function calculateScores(
    eventName: string,
    numTeams: number,
    placements: number[]
): number[] {

    const isRelay = eventName.toLowerCase().includes("relay");

    const individualScoring: Record<number, number[]> = {
        2: [5, 3, 1],
        3: [5, 3, 2, 1],
        4: [6, 4, 3, 2, 1]
    };

    const relayScoring: Record<number, number[]> = {
        2: [5, 3],
        3: [5, 3, 1],
        4: [6, 4, 2]
    };

    const championshipScoring = [10, 8, 6, 4, 2, 1];

    const scoringTable =
        numTeams > 4
            ? championshipScoring
            : isRelay
                ? relayScoring[numTeams]
                : individualScoring[numTeams];

    return placements.map(p => scoringTable[p - 1] ?? 0);
}