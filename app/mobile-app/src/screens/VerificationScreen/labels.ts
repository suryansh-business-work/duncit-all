import type { Verification } from '@/hooks/useVerifications';

/** Type labels — identical strings to mWeb's verification page. */
export const LABELS: Record<Verification['type'], string> = {
  IDENTITY: 'Identity',
  ADDRESS: 'Address',
  EMAIL: 'Email',
};

/** Status chip label + colour — labels identical to mWeb. */
export const STATUS_META: Record<Verification['status'], { label: string; color: string }> = {
  NOT_SUBMITTED: { label: 'Not Verified', color: '#9aa0a6' },
  PENDING: { label: 'Under review', color: '#fb8c00' },
  APPROVED: { label: 'Verified', color: '#22c55e' },
  REJECTED: { label: 'Rejected', color: '#e53935' },
  VERIFIED_BY_APP: { label: 'Verified by the App', color: '#22c55e' },
};
