import { PORTAL_ACCESS } from '../../constants/portalAccess';

export type PortalAccessStatus = 'PENDING' | 'APPROVED' | 'DENIED';

/** One PORTAL_ACCESS row of the shared approval inbox, as this page reads it. */
export interface PortalAccessRequest {
  id: string;
  status: PortalAccessStatus;
  title: string | null;
  summary: string | null;
  /** The requested portal's key (e.g. 'finance'). */
  target_id: string | null;
  subject_name: string | null;
  subject_email: string | null;
  requested_by_name: string | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string | null;
}

/** Status toggle options ('' = All). Literal keys so the translation gate sees them. */
export const STATUS_FILTERS: ReadonlyArray<{ value: '' | PortalAccessStatus; labelKey: string }> = [
  { value: 'PENDING', labelKey: 'admin.portalAccess.statusPending' },
  { value: 'APPROVED', labelKey: 'admin.portalAccess.statusApproved' },
  { value: 'DENIED', labelKey: 'admin.portalAccess.statusDenied' },
  { value: '', labelKey: 'admin.portalAccess.statusAll' },
];

const PORTAL_NAMES = new Map(PORTAL_ACCESS.map((portal) => [portal.key, portal.name]));

/** Display name for a requested portal key; unknown keys are humanized. */
export function portalNameOf(key: string | null): string {
  if (!key) return '—';
  const known = PORTAL_NAMES.get(key);
  if (known) return known;
  return key
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
