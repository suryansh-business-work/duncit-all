import type { OccasionMark } from '@duncit/utils';

/** Twinkling marks pulse in this many groups — a handful of animated views, not one per bulb. */
const TWINKLE_GROUPS = 6;

export interface GarlandPiece extends OccasionMark {
  id: string;
}

export interface TwinkleGroup {
  /** The pulse phase (0–1) every mark in the group shares. */
  phase: number;
  marks: GarlandPiece[];
}

/**
 * A garland split for drawing: steady marks painted under the first
 * twinkling one (the wire), the twinkling marks grouped by pulse phase, and
 * the steady marks that belong over them (sockets, glints). Paint order
 * within each part is the engine's.
 */
export interface GarlandGroups {
  under: GarlandPiece[];
  twinkles: TwinkleGroup[];
  over: GarlandPiece[];
}

export function garlandGroups(marks: readonly OccasionMark[]): GarlandGroups {
  const pieces = marks.map((mark, n): GarlandPiece => ({ ...mark, id: `mark-${n}` }));
  const first = pieces.findIndex((piece) => piece.twinkle !== null);
  if (first < 0) return { under: pieces, twinkles: [], over: [] };
  const rest = pieces.slice(first);
  const groups = new Map<number, GarlandPiece[]>();
  for (const piece of rest) {
    if (piece.twinkle === null) continue;
    const phase = (Math.round(piece.twinkle * TWINKLE_GROUPS) % TWINKLE_GROUPS) / TWINKLE_GROUPS;
    groups.set(phase, [...(groups.get(phase) ?? []), piece]);
  }
  return {
    under: pieces.slice(0, first),
    twinkles: [...groups.entries()]
      .map(([phase, group]) => ({ phase, marks: group }))
      .sort((a, b) => a.phase - b.phase),
    over: rest.filter((piece) => piece.twinkle === null),
  };
}
