import { useMemo, type MutableRefObject } from 'react';
import { Button, Link, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import RateReviewIcon from '@mui/icons-material/RateReview';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import ReleaseStatusChip, { ReleaseKindChip } from './ReleaseStatusChip';
import type { PaymentReleaseRow } from './queries';

const KIND_OPTIONS = [
  { value: 'VENUE_BILLING', label: 'Venue Billing' },
  { value: 'HOST_PAYMENT', label: 'Host Payment' },
];

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

const getReleaseRowId = (row: PaymentReleaseRow) => row.id;

const renderKind = (row: PaymentReleaseRow) => <ReleaseKindChip kind={row.kind} />;

const renderPod = (row: PaymentReleaseRow) => (
  <Stack component="span" sx={{ lineHeight: 1.2 }}>
    <Link component={RouterLink} to={`/pod-finance/${row.pod_id}`} underline="hover">
      <Typography variant="body2" fontWeight={700} component="span">
        {row.pod_title}
      </Typography>
    </Link>
    <Typography variant="caption" color="text.secondary" component="span">
      {row.release_id}
    </Typography>
  </Stack>
);

const renderBeneficiary = (row: PaymentReleaseRow) => (
  <Stack component="span" sx={{ lineHeight: 1.2 }}>
    <Typography variant="body2" component="span">
      {row.beneficiary_name}
    </Typography>
    <Typography variant="caption" color="text.secondary" component="span">
      {row.beneficiary_email}
    </Typography>
  </Stack>
);

const renderProof = (row: PaymentReleaseRow) => (
  <Stack spacing={0.25} component="span" sx={{ lineHeight: 1.2 }}>
    {row.bill_url && (
      <Link href={row.bill_url} target="_blank" rel="noreferrer" variant="caption">
        Bill
      </Link>
    )}
    {row.evidence_media?.length ? (
      <Typography variant="caption" component="span">{row.evidence_media.length} media files</Typography>
    ) : null}
    {row.notes && (
      <Typography variant="caption" color="text.secondary" component="span">
        {row.notes}
      </Typography>
    )}
  </Stack>
);

const proofValue = (row: PaymentReleaseRow) =>
  [
    row.bill_url ? 'Bill' : '',
    row.evidence_media?.length ? `${row.evidence_media.length} media files` : '',
    row.notes ?? '',
  ]
    .filter(Boolean)
    .join(' · ');

const renderStatus = (row: PaymentReleaseRow) => <ReleaseStatusChip status={row.status} />;

interface Props {
  fetchRows: TableFetch<PaymentReleaseRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  onReview: (row: PaymentReleaseRow) => void;
}

export default function PaymentReleaseTable({ fetchRows, refetchRef, onReview }: Readonly<Props>) {
  const columns = useMemo<DuncitColumn<PaymentReleaseRow>[]>(() => {
    const renderActions = (row: PaymentReleaseRow) => (
      <Button size="small" startIcon={<RateReviewIcon />} disabled={row.status !== 'PENDING'} onClick={() => onReview(row)}>
        Review
      </Button>
    );
    return [
      {
        field: 'kind',
        headerName: 'Type',
        width: 140,
        filter: { type: 'select', options: KIND_OPTIONS },
        cellRenderer: renderKind,
        valueGetter: (row) => row.kind,
      },
      {
        field: 'pod_title',
        headerName: 'Pod',
        flex: 1,
        minWidth: 200,
        cellRenderer: renderPod,
        valueGetter: (row) => row.pod_title,
      },
      {
        field: 'beneficiary_name',
        headerName: 'Beneficiary',
        minWidth: 180,
        cellRenderer: renderBeneficiary,
        valueGetter: (row) => row.beneficiary_name,
      },
      {
        field: 'amount_requested',
        headerName: 'Requested',
        width: 120,
        filter: { type: 'number' },
        valueGetter: (row) => `Rs ${Number(row.amount_requested || 0).toFixed(2)}`,
      },
      {
        field: 'proof',
        headerName: 'Proof',
        sortable: false,
        minWidth: 160,
        cellRenderer: renderProof,
        valueGetter: proofValue,
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 120,
        filter: { type: 'select', options: STATUS_OPTIONS },
        cellRenderer: renderStatus,
        valueGetter: (row) => row.status,
      },
      {
        field: 'requested_at',
        headerName: 'Requested at',
        hide: true,
        width: 170,
        filter: { type: 'date' },
        valueGetter: (row) => {
          const d = new Date(row.requested_at);
          return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('en-IN');
        },
      },
      { field: 'actions', headerName: 'Actions', sortable: false, width: 130, cellRenderer: renderActions },
    ];
  }, [onReview]);

  return (
    <DuncitTable<PaymentReleaseRow>
      tableId="finance-payment-releases"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getReleaseRowId}
      emptyText="No payment release requests found."
      defaultSort={{ field: 'requested_at', dir: 'desc' }}
      searchPlaceholder="Search release, pod or beneficiary"
      refetchRef={refetchRef}
    />
  );
}
