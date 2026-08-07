/**
 * What a cover-image picker searches for, and how many it may take.
 *
 * Framework-free on purpose: mWeb renders this with MUI and the native app with
 * Tamagui, and rule 27 says the two must behave identically. The UI is allowed
 * to differ; the search term and the cap are not, so they live here and both
 * surfaces import them (rule 40).
 */

/** Most images one cover picker may return in a single visit. */
export const MAX_COVER_IMAGES = 5;

/**
 * A pod is a group activity, and its cover is a wide banner. A raw
 * sub-category ("Badminton") returns close-up equipment shots; adding the
 * people terms returns the rooms full of people that actually read as a pod.
 */
const GROUP_TERMS = 'group of people';

/**
 * The Pexels query for a pod cover, from the sub-category the host already
 * picked in the form.
 *
 * Returns '' when nothing is selected — the server answers a blank query with
 * Pexels' curated feed, which is a better empty state than no results.
 */
export function coverSearchTerm(subCategoryName?: string | null): string {
  const name = (subCategoryName ?? '').trim();
  if (!name) return '';
  return `${name} ${GROUP_TERMS}`;
}

/**
 * How many more the picker may take, given what the field already holds.
 * Never negative, so a field that somehow went over the cap still opens.
 */
export function coverSlotsLeft(alreadyChosen: number, max = MAX_COVER_IMAGES): number {
  const used = Math.max(0, Math.floor(Number(alreadyChosen) || 0));
  return Math.max(0, max - used);
}

/**
 * How many one OPEN of the picker may return, for a field that is not a cover.
 *
 * The five is a batch size, not a lifetime limit. The same media field also
 * collects a host's edit-time media and the photos they post after the pod
 * happened, and neither of those was ever capped — capping them because the
 * cover is capped would quietly take a feature away. `totalMax` is what turns
 * the batch into a real ceiling, and only the cover field passes it.
 */
export function pickerBatchSize(alreadyChosen: number, totalMax?: number | null): number {
  if (totalMax == null) return MAX_COVER_IMAGES;
  return Math.min(MAX_COVER_IMAGES, coverSlotsLeft(alreadyChosen, totalMax));
}

/**
 * Add a URL to a selection, refusing duplicates and anything past the cap.
 * Returns the SAME array when nothing changed, so React skips the re-render.
 */
export function addToSelection(current: readonly string[], url: string, max: number): string[] {
  if (!url || current.includes(url) || current.length >= max) return current as string[];
  return [...current, url];
}
