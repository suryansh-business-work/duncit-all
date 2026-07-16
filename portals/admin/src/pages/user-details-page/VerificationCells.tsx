import { useState } from 'react';
import { Button, Link, Stack, TextField, Typography } from '@mui/material';
import { StatusChip, type StatusColorMap } from '@duncit/ui';

export interface VerificationAddress {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  country?: string | null;
}

export type VerificationType = 'IDENTITY' | 'ADDRESS' | 'EMAIL';

export interface VerificationItem {
  type: VerificationType;
  status: string;
  document_url?: string | null;
  address?: VerificationAddress | null;
  reject_reason?: string | null;
}

export const TYPE_LABELS: Record<VerificationType, string> = {
  IDENTITY: 'Identity',
  ADDRESS: 'Address',
  EMAIL: 'Email',
};

const STATUS_LABEL: Record<string, string> = {
  NOT_SUBMITTED: 'Not Verified',
  PENDING: 'Under Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  VERIFIED_BY_APP: 'Verified by the App',
};

const STATUS_COLOR: StatusColorMap = {
  NOT_SUBMITTED: 'default',
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
  VERIFIED_BY_APP: 'success',
};

export const statusLabel = (status: string) => STATUS_LABEL[status] ?? status;

export const renderStatusCell = (item: VerificationItem) => (
  <StatusChip status={item.status} label={statusLabel(item.status)} colorMap={STATUS_COLOR} />
);

const addressLines = (address: VerificationAddress) =>
  [
    address.line1,
    address.line2,
    [address.city, address.state, address.pincode].filter(Boolean).join(' '),
    address.country,
  ].filter((line) => Boolean(line?.trim()));

export const detailValue = (item: VerificationItem) => {
  if (item.type === 'ADDRESS') return item.address ? addressLines(item.address).join(', ') : '';
  return item.document_url ?? '';
};

const EmptyDetail = () => (
  <Typography variant="caption" color="text.secondary" component="span">
    —
  </Typography>
);

export const renderDetailCell = (item: VerificationItem) => {
  if (item.type === 'ADDRESS') {
    const joined = item.address ? addressLines(item.address).join(', ') : '';
    if (!joined) return <EmptyDetail />;
    return (
      <Typography variant="body2" noWrap title={joined} component="span">
        {joined}
      </Typography>
    );
  }
  if (!item.document_url) return <EmptyDetail />;
  return (
    <Link href={item.document_url} target="_blank" rel="noopener">
      View
    </Link>
  );
};

export type ReviewStatus = 'APPROVED' | 'REJECTED';

interface ReviewCellProps {
  item: VerificationItem;
  saving: boolean;
  onAct: (type: VerificationType, status: ReviewStatus, reason: string) => void;
}

/** Per-row Approve/Reject controls with a local reject-reason input. State lives
 * in the cell so typing never rebuilds the parent table's column defs. */
export function ReviewCell({ item, saving, onAct }: Readonly<ReviewCellProps>) {
  const [reason, setReason] = useState('');
  const reviewable = item.type === 'IDENTITY' || item.type === 'ADDRESS';
  if (!reviewable) {
    return (
      <Typography variant="caption" color="text.secondary" component="span">
        No review needed
      </Typography>
    );
  }
  return (
    <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center" component="span">
      <TextField
        size="small"
        placeholder="Reject reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        sx={{ width: 160 }}
      />
      <Button
        size="small"
        color="success"
        variant="outlined"
        disabled={saving}
        onClick={() => onAct(item.type, 'APPROVED', reason)}
      >
        Approve
      </Button>
      <Button
        size="small"
        color="error"
        variant="outlined"
        disabled={saving}
        onClick={() => onAct(item.type, 'REJECTED', reason)}
      >
        Reject
      </Button>
    </Stack>
  );
}
