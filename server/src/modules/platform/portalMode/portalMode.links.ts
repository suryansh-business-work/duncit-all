import { getStatusEnvironment } from '@observability/statusServices';
import { PORTAL_REGISTRY } from './portalMode.registry';

/**
 * A page of another console on this environment's host: the registered
 * production URL, moved to `staging.<host>` on staging. Null when the console
 * is not registered, so a caller can leave the link out instead of guessing.
 */
export function consoleUrl(key: string, pathname: string): string | null {
  const registered = PORTAL_REGISTRY.find((portal) => portal.key === key)?.url;
  if (!registered) return null;
  const url = new URL(registered);
  if (getStatusEnvironment() === 'staging') url.hostname = `staging.${url.hostname}`;
  url.pathname = pathname;
  return url.toString();
}
