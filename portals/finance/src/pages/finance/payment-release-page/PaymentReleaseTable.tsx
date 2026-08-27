import { useMemo, type MutableRefObject } from 'react';
import { Link, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import RateReviewIcon from '@mui/icons-material/RateReview';
import { DuncitButton } from '@duncit/buttons';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import { StatusChip } from '@duncit/ui';
import { ReleaseKindChip } from './ReleaseStatusChip';
import type { PaymentReleaseRow } from './queries';
import { useTranslation } from '@duncit/app-settings';

type Translate = ReturnType<typeof useTranslation>['t'];

const kindOptions = (t: Translate) => [
  { value: 'VENUE_BILLING', label: t('finance.paymentRelease.venueBilling') },
  { value: 'HOST_PAYMENT', label: t('finance.paymentRelease.hostPayment') },
  { value: 'CLUB_ADMIN', label: t('finance.common.clubAdmin') },
  { value: 'ECOMM_PAYMENT', label: t('finance.paymentRelease.eCommerceBrand') },
];

const statusOptions = (t: Translate) => [
  { value: 'PENDING', label: t('finance.common.pending') },
  { value: 'APPROVED', label: t('finance.paymentRelease.approved') },
  { value: 'REJECTED', label: t('finance.common.rejected') },
];

const getReleaseRowId = (row: PaymentReleaseRow) => row.id;

const renderKind = (row: PaymentReleaseRow) => <ReleaseKindChip kind={row.kind} />;

const renderPod = (row: PaymentReleaseRow) => (
  <Stack component="span" sx={{ lineHeight: 1.2 }}>
    <Link component={RouterLink} to={`/pod-finance/${row.pod_id}`} underline="hover">
      <Typography variant="body2" component="span" sx={{
        fontWeight: 700
      }}>
        {row.pod_title}
      </Typography>
    </Link>
    <Typography variant="caption" component="span" sx={{
      color: "text.secondary"
    }}>
      {row.release_id}
    </Typography>
  </Stack>
);

const renderBeneficiary = (row: PaymentReleaseRow) => (
  <Stack component="span" sx={{ lineHeight: 1.2 }}>
    <Typography variant="body2" component="span">
      {row.beneficiary_name}
    </Typography>
    <Typography variant="caption" component="span" sx={{
      color: "text.secondary"
    }}>
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
      <Typography variant="caption" component="span" sx={{
        color: "text.secondary"
      }}>
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

const renderStatus = (row: PaymentReleaseRow) => <StatusChip status={row.status} fallbackColor="warning" />;

interface Props {
  fetchRows: TableFetch<PaymentReleaseRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  onReview: (row: PaymentReleaseRow) => void;
}

export default function PaymentReleaseTable({ fetchRows, refetchRef, onReview }: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<PaymentReleaseRow>[]>(() => {
    const renderActions = (row: PaymentReleaseRow) => (
      <DuncitButton size="small" startIcon={<RateReviewIcon />} disabled={row.status !== 'PENDING'} onClick={() => onReview(row)}>
        Review
      </DuncitButton>
    );
    return [
      {
        field: 'kind',
        headerName: t('shell.common.type'),
        width: 140,
        filter: { type: 'select', options: kindOptions(t) },
        cellRenderer: renderKind,
        valueGetter: (row) => row.kind,
      },
      {
        field: 'pod_title',
        headerName: t('finance.common.pod'),
        flex: 1,
        minWidth: 200,
        cellRenderer: renderPod,
        valueGetter: (row) => row.pod_title,
      },
      {
        field: 'beneficiary_name',
        headerName: t('finance.paymentRelease.beneficiary'),
        minWidth: 180,
        cellRenderer: renderBeneficiary,
        valueGetter: (row) => row.beneficiary_name,
      },
      {
        field: 'amount_requested',
        headerName: t('finance.common.requested'),
        width: 120,
        filter: { type: 'number' },
        valueGetter: (row) => `Rs ${Number(row.amount_requested || 0).toFixed(2)}`,
      },
      {
        field: 'proof',
        headerName: t('finance.paymentRelease.proof'),
        sortable: false,
        minWidth: 160,
        cellRenderer: renderProof,
        valueGetter: proofValue,
      },
      {
        field: 'status',
        headerName: t('shell.common.status'),
        width: 120,
        filter: { type: 'select', options: statusOptions(t) },
        cellRenderer: renderStatus,
        valueGetter: (row) => row.status,
      },
      {
        field: 'requested_at',
        headerName: t('finance.paymentRelease.requestedAt'),
        hide: true,
        width: 170,
        filter: { type: 'date' },
        valueGetter: (row) => {
          const d = new Date(row.requested_at);
          return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('en-IN');
        },
      },
      { field: 'actions', headerName: t('shell.common.actions'), sortable: false, width: 130, cellRenderer: renderActions },
    ];
  }, [onReview]);

  return (
    <DuncitTable<PaymentReleaseRow>
      tableId="finance-payment-releases"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getReleaseRowId}
      emptyText={t('finance.paymentRelease.noPaymentReleaseRequestsFound')}
      defaultSort={{ field: 'requested_at', dir: 'desc' }}
      searchPlaceholder="Search release, pod or beneficiary"
      refetchRef={refetchRef}
    />
  );
}
