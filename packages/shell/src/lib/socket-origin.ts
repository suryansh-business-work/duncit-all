/**
 * The socket.io origin — the portal's GraphQL URL with its path stripped.
 *
 * One helper rather than a copy per socket call site: staff chat and the
 * session listener connect to the same server, and one drifting from the other
 * would show up as "chat works but the session never updates", which reads like
 * a server fault rather than a client one.
 *
 * Returns '' for an unparseable URL so the caller can skip connecting — there
 * is no sensible default here, unlike in mWeb where the app and the API share
 * an origin.
 */
export function socketOrigin(graphqlUrl: string): string {
  try {
    const url = new URL(graphqlUrl);
    return `${url.protocol}//${url.host}`;
  } catch {
    return '';
  }
}
