export interface SeedableTournamentEntry {
  teamId: string;
  teamName: string;
  seedNumber?: number | null;
  createdAt?: string | null;
}

export interface SeededTournamentEntry extends SeedableTournamentEntry {
  bracketSeed: number;
}

export function compareEntriesByRegistration(a: SeedableTournamentEntry, b: SeedableTournamentEntry) {
  const aCreatedAt = a.createdAt ? new Date(a.createdAt).getTime() : Number.MAX_SAFE_INTEGER;
  const bCreatedAt = b.createdAt ? new Date(b.createdAt).getTime() : Number.MAX_SAFE_INTEGER;
  if (aCreatedAt !== bCreatedAt) {
    return aCreatedAt - bCreatedAt;
  }

  return a.teamName.localeCompare(b.teamName);
}

export function compareEntriesBySeed(a: SeedableTournamentEntry, b: SeedableTournamentEntry) {
  const aSeeded = typeof a.seedNumber === "number" && a.seedNumber > 0;
  const bSeeded = typeof b.seedNumber === "number" && b.seedNumber > 0;

  if (aSeeded && bSeeded && a.seedNumber !== b.seedNumber) {
    return (a.seedNumber ?? 0) - (b.seedNumber ?? 0);
  }

  if (aSeeded !== bSeeded) {
    return aSeeded ? -1 : 1;
  }

  const aCreatedAt = a.createdAt ? new Date(a.createdAt).getTime() : Number.MAX_SAFE_INTEGER;
  const bCreatedAt = b.createdAt ? new Date(b.createdAt).getTime() : Number.MAX_SAFE_INTEGER;
  if (aCreatedAt !== bCreatedAt) {
    return aCreatedAt - bCreatedAt;
  }

  return a.teamName.localeCompare(b.teamName);
}

export function buildSeedPlacementOrder(bracketSize: number): number[] {
  if (bracketSize <= 1) return [1];

  let order = [1, 2];
  while (order.length < bracketSize) {
    const nextSize = order.length * 2;
    const nextOrder: number[] = [];
    for (const seed of order) {
      nextOrder.push(seed, nextSize + 1 - seed);
    }
    order = nextOrder;
  }

  return order;
}

export function assignBracketSeeds(entries: SeedableTournamentEntry[], bracketSize: number): SeededTournamentEntry[] {
  const sortedEntries = [...entries].sort(compareEntriesBySeed);
  const takenSeeds = new Set<number>();

  for (const entry of sortedEntries) {
    if (entry.seedNumber == null) continue;
    if (!Number.isInteger(entry.seedNumber) || entry.seedNumber < 1) {
      throw new Error(`Invalid seed number for ${entry.teamName}.`);
    }
    if (entry.seedNumber > bracketSize) {
      throw new Error(`${entry.teamName} has seed ${entry.seedNumber}, which exceeds the bracket size of ${bracketSize}.`);
    }
    if (takenSeeds.has(entry.seedNumber)) {
      throw new Error(`Duplicate seed number ${entry.seedNumber} detected.`);
    }
    takenSeeds.add(entry.seedNumber);
  }

  const remainingSeeds: number[] = [];
  for (let seed = 1; seed <= bracketSize; seed += 1) {
    if (!takenSeeds.has(seed)) {
      remainingSeeds.push(seed);
    }
  }

  return sortedEntries.map((entry) => ({
    ...entry,
    bracketSeed: entry.seedNumber ?? remainingSeeds.shift() ?? bracketSize,
  }));
}

export function createBracketSlots(entries: SeedableTournamentEntry[], bracketSize: number): Array<SeededTournamentEntry | null> {
  const seededEntries = assignBracketSeeds(entries, bracketSize);
  const placementOrder = buildSeedPlacementOrder(bracketSize);
  const slotIndexBySeed = new Map<number, number>();

  placementOrder.forEach((seed, index) => {
    slotIndexBySeed.set(seed, index);
  });

  const slots: Array<SeededTournamentEntry | null> = Array.from({ length: bracketSize }, () => null);
  seededEntries.forEach((entry) => {
    const slotIndex = slotIndexBySeed.get(entry.bracketSeed);
    if (slotIndex == null) {
      throw new Error(`Unable to place seeded team ${entry.teamName}.`);
    }
    slots[slotIndex] = entry;
  });

  return slots;
}

export function assignSequentialSeeds<T extends SeedableTournamentEntry>(entries: T[]): Array<T & { seedNumber: number }> {
  return [...entries]
    .sort(compareEntriesByRegistration)
    .map((entry, index) => ({
      ...entry,
      seedNumber: index + 1,
    }));
}
