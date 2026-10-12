import { useMemo, type MutableRefObject } from 'react';
import { Link, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router';
import RateReviewIcon from '@mui/icons-material/RateReview';
import { DuncitButton } from '@duncit/buttons';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import { StatusChip } from '@duncit/ui';
import { formatDateTime, useTranslation } from '@duncit/app-settings';
import { ReleaseKindChip } from './ReleaseStatusChip';
import { money } from '../pod-finance-page/queries';
import type { PodPaymentReleaseRow } from './queries';

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

/** Where one pod's request opens. */
export const releasePath = (row: Pick<PodPaymentReleaseRow, 'id'>) =>
  `/payment-release/${encodeURIComponent(row.id)}`;

const getRowId = (row: PodPaymentReleaseRow) => row.id;

const renderPod = (row: PodPaymentReleaseRow) => (
  <Link component={RouterLink} to={releasePath(row)} underline="hover">
    <Typography variant="body2" component="span" sx={{ fontWeight: 700 }}>
      {row.pod_title}
    </Typography>
  </Link>
);

const renderKinds = (row: PodPaymentReleaseRow) => (
  <Stack direction="row" spacing={0.5} useFlexGap component="span" sx={{ flexWrap: 'wrap' }}>
    {row.kinds.map((kind) => (
      <ReleaseKindChip key={kind} kind={kind} />
    ))}
  </Stack>
);

const renderStatus = (row: PodPaymentReleaseRow) => (
  <StatusChip status={row.status} fallbackColor="warning" />
);

/** "Bill · Media: 3" — what came with the request, as text for the cell and the export. */
const proofValue = (row: PodPaymentReleaseRow, t: Translate) =>
  [
    row.has_bill ? t('finance.paymentRelease.billUploaded') : '',
    row.media_count > 0
      ? t('finance.paymentRelease.mediaCount', { vars: { count: row.media_count } })
      : '',
  ]
    .filter(Boolean)
    .join(' · ');

interface Props {
  fetchRows: TableFetch<PodPaymentReleaseRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  /** Currency symbol from Finance settings. */
  symbol: string;
  onOpen: (row: PodPaymentReleaseRow) => void;
}

/** Payment Release: one row per completed pod's request. */
export default function PaymentReleaseTable({
  fetchRows,
  refetchRef,
  symbol,
  onOpen,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<PodPaymentReleaseRow>[]>(() => {
    const renderActions = (row: PodPaymentReleaseRow) => (
      <DuncitButton size="small" startIcon={<RateReviewIcon />} onClick={() => onOpen(row)}>
        {t('finance.paymentRelease.review')}
      </DuncitButton>
    );
    return [
      {
        field: 'pod_title',
        headerName: t('finance.common.pod'),
        flex: 1,
        minWidth: 200,
        type: 'text',
        cellRenderer: renderPod,
        valueGetter: (row) => row.pod_title,
      },
      {
        field: 'kinds',
        headerName: t('finance.paymentRelease.payouts'),
        minWidth: 260,
        type: 'enum',
        options: kindOptions(t),
        // A set of kinds per row — filterable, but there is no order to sort by.
        sortable: false,
        cellRenderer: renderKinds,
        valueGetter: (row) => row.kinds.join(', '),
      },
      {
        field: 'total_requested',
        headerName: t('finance.paymentRelease.totalRequested'),
        width: 150,
        type: 'number',
        valueGetter: (row) => money(symbol, row.total_requested),
      },
      {
        field: 'proof',
        headerName: t('finance.paymentRelease.proof'),
        type: 'text',
        // Assembled from the bill and the media count — no one stored path.
        sortable: false,
        filterable: false,
        minWidth: 140,
        valueGetter: (row) => proofValue(row, t),
      },
      {
        field: 'status',
        headerName: t('shell.common.status'),
        width: 130,
        type: 'enum',
        options: statusOptions(t),
        cellRenderer: renderStatus,
        valueGetter: (row) => row.status,
      },
      {
        field: 'requested_at',
        headerName: t('finance.paymentRelease.requestedAt'),
        hide: true,
        width: 170,
        type: 'date',
        valueGetter: (row) => formatDateTime(row.requested_at),
      },
      {
        field: 'actions',
        headerName: t('shell.common.actions'),
        type: 'actions',
        width: 130,
        cellRenderer: renderActions,
      },
    ];
  }, [onOpen, symbol, t]);

  return (
    <DuncitTable<PodPaymentReleaseRow>
      ariaLabel={t('shell.nav.paymentRelease')}
      tableId="finance-pod-payment-releases"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      onRowClick={onOpen}
      emptyText={t('finance.paymentRelease.noPaymentReleaseRequestsFound')}
      defaultSort={{ field: 'requested_at', dir: 'desc' }}
      searchPlaceholder={t('finance.paymentRelease.searchPlaceholder')}
      refetchRef={refetchRef}
    />
  );
}
