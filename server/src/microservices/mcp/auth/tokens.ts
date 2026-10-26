import { createHash, randomBytes } from 'node:crypto';
import {
  ACCESS_TOKEN_PREFIX,
  ACCESS_TOKEN_TTL_SECONDS,
  CONNECTION_RETENTION_SECONDS,
  REFRESH_TOKEN_PREFIX,
  REFRESH_TOKEN_TTL_SECONDS,
} from '../mcp.constants';

/** Only this digest is stored; the raw value leaves the server once, in the response. */
export const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

/** 256 random bits behind a readable prefix (`dmcp_at_…`, `dmcp_rt_…`). */
export const randomToken = (prefix = ''): string => `${prefix}${randomBytes(32).toString('base64url')}`;

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  /** The fields a connection document stores for this pair. */
  stored: {
    access_hash: string;
    access_expires_at: Date;
    refresh_hash: string;
    refresh_expires_at: Date;
    purge_at: Date;
  };
}

export function issueTokenPair(now = Date.now()): TokenPair {
  const accessToken = randomToken(ACCESS_TOKEN_PREFIX);
  const refreshToken = randomToken(REFRESH_TOKEN_PREFIX);
  const refreshExpiresAt = now + REFRESH_TOKEN_TTL_SECONDS * 1000;
  return {
    accessToken,
    refreshToken,
    stored: {
      access_hash: sha256(accessToken),
      access_expires_at: new Date(now + ACCESS_TOKEN_TTL_SECONDS * 1000),
      refresh_hash: sha256(refreshToken),
      refresh_expires_at: new Date(refreshExpiresAt),
      purge_at: new Date(refreshExpiresAt + CONNECTION_RETENTION_SECONDS * 1000),
    },
  };
}

/** The OAuth token response for a pair. */
export function tokenResponse(pair: TokenPair, scopes: readonly string[]) {
  return {
    access_token: pair.accessToken,
    token_type: 'Bearer',
    expires_in: ACCESS_TOKEN_TTL_SECONDS,
    refresh_token: pair.refreshToken,
    scope: scopes.join(' '),
  };
}
