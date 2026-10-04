/**
 * A Google OAuth client id as Google expects it: `<number>-<hash>.apps.googleusercontent.com`.
 *
 * Operators paste these into Tech › Environment from the Cloud console, and a
 * pasted value has arrived as `https://1089…apps.googleusercontent.com` — the
 * apps sent it to Google as the client id ("Error 401: invalid_client — The
 * OAuth client was not found") and the server compared token audiences against
 * it, so Google sign-in broke on both ends. A scheme, surrounding whitespace and
 * trailing slashes are never part of an id, so they are dropped wherever an id
 * is read: the public client config the apps fetch, and the audience check.
 */
export function cleanGoogleClientId(raw: string | null | undefined): string {
  return (raw ?? '')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '');
}
