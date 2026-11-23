import { lookup } from 'node:dns/promises';
import { isNonPublicAddress, isNonPublicHost } from '@utils/public-host';

/**
 * SSRF guard for MCP connectors. A server URL must be HTTPS, its host must be
 * on the admin's allow-list (Intel › Settings › Security), and every address
 * the name resolves to must be public — so a connector can never be pointed at
 * this host, the LAN, Qdrant, Redis or the cloud metadata service.
 */

export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsafeUrlError';
  }
}

export const hostAllowed = (host: string, allowed: readonly string[]): boolean =>
  allowed.some((entry) => {
    const a = entry.trim().toLowerCase();
    return a !== '' && (host === a || host.endsWith(`.${a}`));
  });

export function parseServerUrl(raw: string, allowed: readonly string[]): URL {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new UnsafeUrlError('The MCP server URL is not a valid URL.');
  }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== 'https:') throw new UnsafeUrlError('MCP servers must be reached over HTTPS.');
  if (url.username || url.password) throw new UnsafeUrlError('Put credentials in the Tech portal token field, not the URL.');
  if (isNonPublicHost(host)) throw new UnsafeUrlError('Private and internal hosts are not allowed.');
  if (!hostAllowed(host, allowed)) throw new UnsafeUrlError(`${host} is not on the MCP host allow-list (Intel › Settings › Security).`);
  return url;
}

export async function assertPublicResolution(url: URL, resolve: typeof lookup = lookup): Promise<void> {
  const addresses = await resolve(url.hostname, { all: true, verbatim: true });
  if (addresses.length === 0 || addresses.some((a) => isNonPublicAddress(a.address, a.family))) {
    throw new UnsafeUrlError(`${url.hostname} resolves to a private address.`);
  }
}
