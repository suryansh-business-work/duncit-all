/**
 * Pod media — the framework-free half, shared by mWeb and the native app
 * (rules 27/40).
 *
 * The photos and videos FROM a pod: what the host uploaded and what the people
 * who came sent in from the link the host gave them. This module owns the ONE
 * address that page lives at, so the mWeb route, the native deep link, the
 * short link the server mints and the message a host sends can never point at
 * four different places.
 */

/** Where a pod's media page lives on the web. */
export const podMediaPath = (podId: string): string => `/pod/${podId}/media`;

/** The same path as a full URL, for a message that leaves the app. */
export const podMediaLink = (podId: string, baseUrl: string): string =>
  `${baseUrl}${podMediaPath(podId)}`;
