import {
  Button,
  Chip,
  Link,
  Stack,
  TableCell,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';

export interface VerificationAddress {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  country?: string | null;
}

export interface VerificationItem {
  type: 'IDENTITY' | 'ADDRESS' | 'EMAIL';
  status: string;
  document_url?: string | null;
  address?: VerificationAddress | null;
  reject_reason?: string | null;
}

const LABELS: Record<VerificationItem['type'], string> = {
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

const STATUS_COLOR: Record<string, 'default' | 'warning' | 'success' | 'error'> = {
  NOT_SUBMITTED: 'default',
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
  VERIFIED_BY_APP: 'success',
};

const ADDRESS_LINES = (address: VerificationAddress) =>
  [
    address.line1,
    address.line2,
    [address.city, address.state, address.pincode].filter(Boolean).join(' '),
    address.country,
  ].filter((line) => Boolean(line && line.trim()));

function IdentityDetail({ item }: Readonly<{ item: VerificationItem }>) {
  if (!item.document_url) {
    return (
      <Typography variant="caption" color="text.secondary">
        —
      </Typography>
    );
  }
  return (
    <Link href={item.document_url} target="_blank" rel="noopener">
      View
    </Link>
  );
}

function AddressDetail({ item }: Readonly<{ item: VerificationItem }>) {
  const lines = item.address ? ADDRESS_LINES(item.address) : [];
  if (lines.length === 0) {
    return (
      <Typography variant="caption" color="text.secondary">
        —
      </Typography>
    );
  }
  return (
    <Stack spacing={0.25}>
      {lines.map((line) => (
        <Typography key={line} variant="body2">
          {line}
        </Typography>
      ))}
    </Stack>
  );
}

interface RowProps {
  item: VerificationItem;
  reason: string;
  saving: boolean;
  onReasonChange: (value: string) => void;
  onAct: (status: 'APPROVED' | 'REJECTED') => void;
}

export default function VerificationRow({
  item,
  reason,
  saving,
  onReasonChange,
  onAct,
}: Readonly<RowProps>) {
  const reviewable = item.type === 'IDENTITY' || item.type === 'ADDRESS';

  return (
    <TableRow>
      <TableCell>{LABELS[item.type]}</TableCell>
      <TableCell>
        <Chip
          size="small"
          label={STATUS_LABEL[item.status] ?? item.status}
          color={STATUS_COLOR[item.status] ?? 'default'}
        />
      </TableCell>
      <TableCell>
        {item.type === 'ADDRESS' ? <AddressDetail item={item} /> : <IdentityDetail item={item} />}
      </TableCell>
      <TableCell align="right">
        {reviewable ? (
          <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
            <TextField
              size="small"
              placeholder="Reject reason"
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              sx={{ width: 160 }}
            />
            <Button
              size="small"
              color="success"
              variant="outlined"
              disabled={saving}
              onClick={() => onAct('APPROVED')}
            >
              Approve
            </Button>
            <Button
              size="small"
              color="error"
              variant="outlined"
              disabled={saving}
              onClick={() => onAct('REJECTED')}
            >
              Reject
            </Button>
          </Stack>
        ) : (
          <Typography variant="caption" color="text.secondary">
            No review needed
          </Typography>
        )}
      </TableCell>
    </TableRow>
  );
}
