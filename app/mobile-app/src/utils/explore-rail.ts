/** Approx pitch of one reel action (button 46 + caption + gap). */
export const RAIL_ITEM_PITCH = 76;

export interface RailLayout {
  /** How many actions render inline (the rest collapse into the More menu). */
  visible: number;
  overflow: boolean;
}

/**
 * Decide how many reel actions fit inline given the available vertical space;
 * the remainder collapse behind a "More" button. When the height is unknown
 * (<= 0) everything is shown. One slot is reserved for the More button itself.
 */
export function railLayout(total: number, available: number, pitch = RAIL_ITEM_PITCH): RailLayout {
  if (available <= 0) return { visible: total, overflow: false };
  const capacity = Math.max(1, Math.floor(available / pitch));
  if (total <= capacity) return { visible: total, overflow: false };
  return { visible: Math.max(0, capacity - 1), overflow: true };
}
