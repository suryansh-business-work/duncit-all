/**
 * Native's answer to mWeb's `?redirect` preservation: a booking deep link that
 * arrives while the user is signed out has nowhere to live (there is no address
 * bar to carry the target), so its id is parked here, the link routes to Login,
 * and RootNavigator replays it the moment the signed-in stack exists.
 */
let pendingBookingId: string | null = null;

export function rememberPendingBooking(bookingId: string): void {
  pendingBookingId = bookingId;
}

/** Reads and clears the parked booking id — replaying it must happen once. */
export function consumePendingBooking(): string | null {
  const id = pendingBookingId;
  pendingBookingId = null;
  return id;
}

/** `booking/:bookingId` (with or without a leading slash) → the id; else null. */
export function bookingIdFromPath(path: string): string | null {
  const id = /^\/?booking\/([^/?#]+)/.exec(path)?.[1];
  return id ? decodeURIComponent(id) : null;
}
