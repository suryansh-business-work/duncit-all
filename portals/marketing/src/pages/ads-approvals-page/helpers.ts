import type { StatusColorMap } from '@duncit/ui';
import type { AdPosition } from '../../lib/ad-positions';

export type AdMediaType = 'IMAGE' | 'VIDEO';
export type AdKind = 'PLACEMENT' | 'PRODUCT_AD' | 'BRAND_AD';

/** Stored review states. LIVE/EXPIRED are derived display windows of APPROVED. */
export type AdStoredStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type AdDisplayStatus = AdStoredStatus | 'LIVE' | 'EXPIRED';

/** Row shape of `adRequestsTable` (matches the AdRequest GraphQL type). */
export interface AdRequestRow {
  id: string;
  trace_id: string;
  ad_kind: AdKind;
  brand_name: string | null;
  product_name: string | null;
  product_image: string | null;
  ad_title: string;
  ad_description: string;
  ad_type: AdMediaType;
  media_url: string;
  position: AdPosition;
  start_at: string;
  duration_days: number;
  end_at: string;
  redirect_url: string | null;
  target_audience: string | null;
  status: AdDisplayStatus;
  marketing_remarks: string | null;
  estimated_cost: number;
  approved_cost: number | null;
  currency_symbol: string;
  submitted_by: string;
  submitted_by_name: string;
  reviewed_at: string | null;
  created_at: string;
}

/**
 * Toolbar tabs pin the STORED status ('' = All). The server filters on the
 * stored value, so the Approved tab also carries the derived LIVE/EXPIRED rows.
 */
export const STATUS_FILTERS: ReadonlyArray<{ value: '' | AdStoredStatus; label: string }> = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: '', label: 'All' },
];

/** Ads display vocabulary — full replacement map for StatusChip. */
export const AD_STATUS_CHIP_COLORS: StatusColorMap = {
  PENDING: 'warning',
  APPROVED: 'info',
  LIVE: 'success',
  REJECTED: 'error',
  EXPIRED: 'default',
};
