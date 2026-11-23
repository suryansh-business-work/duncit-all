import { formatDateTime } from '@duncit/app-settings';
import { EM_DASH, type Translate } from '@duncit/table';
import type { StatusColorMap } from '@duncit/ui';

/**
 * What the two Security pages say about a value the server sends.
 *
 * The server sends data keys (VERIFIED, PENDING, PERMISSION_DENIED…), never
 * copy. Each one maps to a translation key written out whole: the shipped-key
 * gate reads source for the literal, so a key composed from the value would
 * review fine and fail CI.
 */
type KeyMap = Readonly<Record<string, string>>;

/** How a verification ended. */
export const RESULT_KEY: KeyMap = {
  VERIFIED: 'tech.portalSecurity.result.verified',
  EXCEPTION_APPROVED: 'tech.portalSecurity.result.exceptionApproved',
  LOCATION_DENIED: 'tech.portalSecurity.result.locationDenied',
};

export const RESULT_COLOR: StatusColorMap = {
  VERIFIED: 'success',
  EXCEPTION_APPROVED: 'warning',
  LOCATION_DENIED: 'error',
};

/** What proved the person was where they said. */
export const METHOD_KEY: KeyMap = {
  GPS: 'tech.portalSecurity.method.gps',
  ADMIN_EXCEPTION: 'tech.portalSecurity.method.adminException',
};

/** Where an alternative-verification request stands. */
export const REQUEST_STATUS_KEY: KeyMap = {
  PENDING: 'tech.portalSecurity.status.pending',
  APPROVED: 'tech.portalSecurity.status.approved',
  REJECTED: 'tech.portalSecurity.status.rejected',
  USED: 'tech.portalSecurity.status.used',
  EXPIRED: 'tech.portalSecurity.status.expired',
};

export const REQUEST_STATUS_COLOR: StatusColorMap = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
  USED: 'info',
  EXPIRED: 'default',
};

/** Why the browser gave no position (GeolocationPositionError, as the server records it). */
export const LOCATION_ERROR_KEY: KeyMap = {
  PERMISSION_DENIED: 'tech.portalSecurity.locationError.permissionDenied',
  POSITION_UNAVAILABLE: 'tech.portalSecurity.locationError.positionUnavailable',
  TIMEOUT: 'tech.portalSecurity.locationError.timeout',
  UNSUPPORTED: 'tech.portalSecurity.locationError.unsupported',
};

/** What a reviewer did to a record. */
export const ACCESS_ACTION_KEY: KeyMap = {
  VIEW: 'tech.portalSecurity.access.view',
  LIST: 'tech.portalSecurity.access.list',
};

/** A value, or the em-dash a table and a detail view both use for "nothing here". */
export const orDash = (value: string | null | undefined): string => value || EM_DASH;

/** A stored time in the admin's configured format and zone — never a hardcoded pattern. */
export const timeOf = (iso: string | null | undefined): string => formatDateTime(iso) || EM_DASH;

/** The parts that exist, joined; an em-dash when none do. */
export const joinParts = (parts: ReadonlyArray<string | null | undefined>, separator: string): string =>
  orDash(parts.filter(Boolean).join(separator));

/** A server value as the reader's language names it. A value this table has not caught up with shows as sent. */
export function enumLabel(t: Translate, keys: KeyMap, value: string | null | undefined): string {
  if (!value) return EM_DASH;
  const key = keys[value];
  return key ? t(key) : value;
}

/** The options of an enum column's filter, labelled in the reader's language. */
export const enumOptions = (t: Translate, keys: KeyMap) =>
  Object.entries(keys).map(([value, key]) => ({ value, label: t(key) }));

interface NoLocation {
  has_location: boolean;
  location_error?: string | null;
  method?: string | null;
}

/**
 * Why a record has no position to show.
 *
 * A reviewer reading a verification without a map has to know whether the
 * person said no, the browser failed, an administrator approved another way, or
 * the record itself is damaged — and those are four different conversations.
 */
export function noLocationText(t: Translate, record: Readonly<NoLocation>): string {
  if (record.has_location) return t('tech.loginVerifications.where.unreadable');
  if (record.location_error) return enumLabel(t, LOCATION_ERROR_KEY, record.location_error);
  if (record.method === 'ADMIN_EXCEPTION') return t('tech.loginVerifications.where.viaException');
  return t('tech.loginVerifications.where.none');
}
