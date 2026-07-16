export interface ApprovalDetail {
  label: string;
  value: string | null;
}

export interface ApprovalRequest {
  id: string;
  type: string;
  status: ApprovalStatus;
  source_portal: string | null;
  title: string | null;
  summary: string | null;
  details: ApprovalDetail[];
  kind: string | null;
  subject_name: string | null;
  subject_email: string | null;
  subject_phone: string | null;
  requested_by_name: string | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'DENIED';

/** Filter options: status value ('' = All) plus a human label. */
export const STATUS_FILTERS: ReadonlyArray<{ value: '' | ApprovalStatus; label: string }> = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'DENIED', label: 'Denied' },
  { value: '', label: 'All' },
];

export const humanizeType = (type: string): string =>
  type
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
