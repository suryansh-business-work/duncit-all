import type { PodRow } from './queries';
import { formatDateTime } from '@duncit/app-settings';

export const POD_MODE_OPTIONS = [
  { value: 'PHYSICAL', label: 'Physical' },
  { value: 'VIRTUAL', label: 'Virtual' },
] as const;

export const POD_TYPE_OPTIONS = [
  'NATIVE_FREE',
  'NATIVE_PAID',
  'NATIVE_PAID_PREMIUM',
  'NON_NATIVE_FREE',
  'NON_NATIVE_PAID',
].map((value) => ({ value, label: value.replaceAll('_', ' ') }));

export const modeLabel = (p: PodRow) => (p.pod_mode === 'VIRTUAL' ? 'Virtual' : 'Physical');

export const typeValue = (p: PodRow) => `${modeLabel(p)} · ${p.pod_type.replaceAll('_', ' ')}`;

export const statusValue = (p: PodRow) => {
  if (p.is_deleted) return 'Cancelled';
  if (p.completed_at) return 'Completed';
  if (p.venue_approval_status === 'PENDING') return 'Awaiting venue';
  if (p.venue_approval_status === 'DECLINED') return 'Venue rejected';
  return p.is_active ? 'Active' : 'Draft';
};

export const productLines = (p: PodRow) =>
  (p.product_requests ?? []).map((i) => `${i.product_name}: ${i.quantity}`).join(', ');

export const productsValue = (p: PodRow) => {
  const items = p.product_requests ?? [];
  if (items.length === 0) return '—';
  return `${productLines(p)} · ₹${p.product_cost_total ?? 0}`;
};

export const spotsValue = (p: PodRow) => {
  const cap = p.no_of_spots ? ` / ${p.no_of_spots}` : '';
  return `${p.pod_attendees?.length ?? 0}${cap}`;
};

export const dateValue = (iso?: string | null) => (iso ? formatDateTime(iso) : '—');
