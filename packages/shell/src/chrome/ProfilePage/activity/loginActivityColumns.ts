import type { DuncitColumn } from '@duncit/table';
import type { Translate } from '../../../i18n/fallback';
import type { LoginActivityEntry } from '../queries';

/** Each method's words. Keys are written out — the translation gate only sees literals. */
const methodOptions = (t: Translate) => [
  { value: 'EMAIL', label: t('shell.profile.activity.methodPassword') },
  { value: 'OTP', label: t('shell.profile.activity.methodCode') },
  { value: 'GOOGLE', label: t('shell.profile.activity.methodGoogle') },
  { value: 'APPLE', label: t('shell.profile.activity.methodApple') },
];

function deviceKind(t: Translate, deviceType: string | null): string {
  switch (deviceType) {
    case 'MOBILE':
      return t('shell.profile.activity.deviceMobile');
    case 'TABLET':
      return t('shell.profile.activity.deviceTablet');
    case 'DESKTOP':
      return t('shell.profile.activity.deviceDesktop');
    default:
      return '';
  }
}

/** "Chrome on Windows · Computer" — whatever parts the user agent gave away. */
export function deviceValue(t: Translate, row: LoginActivityEntry): string {
  const agent =
    row.browser && row.os
      ? t('shell.profile.activity.deviceOn', { vars: { browser: row.browser, os: row.os } })
      : row.browser || row.os || '';
  const parts = [agent, deviceKind(t, row.device_type)].filter(Boolean);
  return parts.length ? parts.join(' · ') : t('shell.profile.activity.unknown');
}

/** "Lucknow, UP, IN" — an offline geo-IP guess, so any part can be missing. */
export function locationValue(t: Translate, row: LoginActivityEntry): string {
  const parts = [row.city, row.region, row.country].filter(Boolean);
  return parts.length ? parts.join(', ') : t('shell.profile.activity.unknown');
}

/** The console's own host when the browser sent one; the app and mWeb by their surface. */
export function signedInOnValue(t: Translate, row: LoginActivityEntry): string {
  if (row.origin_host) return row.origin_host;
  if (row.surface === 'NATIVE') return t('shell.profile.activity.surfaceApp');
  if (row.surface === 'MWEB') return t('shell.profile.activity.surfaceWeb');
  return t('shell.profile.activity.unknown');
}

export const loginActivityColumns = (
  t: Translate,
  formatDateTime: (value: string) => string,
): DuncitColumn<LoginActivityEntry>[] => [
  {
    field: 'signed_in_at',
    headerName: t('shell.profile.activity.colWhen'),
    type: 'date',
    minWidth: 190,
    valueGetter: (row) => formatDateTime(row.signed_in_at),
  },
  {
    field: 'provider',
    headerName: t('shell.profile.activity.colMethod'),
    type: 'enum',
    options: methodOptions(t),
    width: 150,
    valueGetter: (row) =>
      methodOptions(t).find((option) => option.value === row.provider)?.label ?? t('shell.profile.activity.unknown'),
  },
  {
    field: 'city',
    headerName: t('shell.profile.activity.colLocation'),
    type: 'text',
    flex: 1,
    minWidth: 180,
    valueGetter: (row) => locationValue(t, row),
  },
  {
    field: 'browser',
    headerName: t('shell.profile.activity.colDevice'),
    type: 'text',
    flex: 1,
    minWidth: 200,
    valueGetter: (row) => deviceValue(t, row),
  },
  {
    field: 'origin_host',
    headerName: t('shell.profile.activity.colSignedInOn'),
    type: 'text',
    minWidth: 180,
    valueGetter: (row) => signedInOnValue(t, row),
  },
  {
    field: 'ip',
    headerName: t('shell.profile.activity.colIp'),
    type: 'text',
    minWidth: 150,
    valueGetter: (row) => row.ip ?? t('shell.profile.activity.unknown'),
  },
];
