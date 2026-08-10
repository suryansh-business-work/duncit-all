import { urlConfigs } from '../config/url-configs';

/**
 * The socket.io origin — the GraphQL URL with its path stripped.
 *
 * One helper rather than a copy per socket hook: they all connect to the same
 * server, and the pod-chat copy drifting from the session copy would show as
 * "chat works, the session never updates", which reads like a server bug.
 */
export function getSocketUrl(): string {
  try {
    const u = new URL(urlConfigs.graphqlUrl);
    return `${u.protocol}//${u.host}`;
  } catch {
    return globalThis.window.location.origin;
  }
}
