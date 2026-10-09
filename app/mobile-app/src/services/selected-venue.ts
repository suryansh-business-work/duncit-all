import { getItem, setItem } from '@/services/secure-storage';

const KEY = 'duncit.selected_venue';

/** The venue the owner last picked in Venue Studio, or null when none was saved.
 * Whether it still names one of their venues is `pickVenue`'s call, not ours. */
export async function getSelectedVenueId(): Promise<string | null> {
  const value = await getItem(KEY);
  return value || null;
}

export async function setSelectedVenueId(venueId: string): Promise<void> {
  await setItem(KEY, venueId);
}
