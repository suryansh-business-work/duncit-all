import type { Translator } from '@duncit/app-settings';

/** What the venue's bookings board and its numbers are given by the surface that mounts them. */
export interface VenueRentalProps {
  /** The venue whose desk this is: venue selection stays with the host page. */
  venueId: string;
  /**
   * The mounting surface's table-id prefix (`partners-app`, `venues`). A table
   * remembers its column choices per id, so each surface keeps its own.
   */
  surface: string;
}

/** The `t` the column builders take: the shared hook's translator. */
export type Translate = Translator['t'];
