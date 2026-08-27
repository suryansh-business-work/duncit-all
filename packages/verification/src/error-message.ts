/**
 * What a failed submission tells the user.
 *
 * The server's message is the useful one when there is a real message — "Pincode
 * does not match the city" beats a generic sentence. A rejection that is not an
 * Error (a string thrown by a transport, an aborted request) has nothing worth
 * showing, so the localized fallback stands in.
 */
export function submissionErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
