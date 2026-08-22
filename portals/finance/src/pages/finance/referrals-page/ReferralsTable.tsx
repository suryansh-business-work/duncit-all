import { Chip } from '@mui/material';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import type { ReferralRow } from './queries';
import { formatDateTime } from '@duncit/app-settings';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  fetchRows: TableFetch<ReferralRow>;
}

const getReferralRowId = (r: ReferralRow) => r.id;

const referrerValue = (r: ReferralRow) => r.referrer_name || r.referrer_user_id;
const referredValue = (r: ReferralRow) => r.referred_name || r.referred_user_id;
const whenValue = (r: ReferralRow) => formatDateTime(r.created_at);

const renderCode = (r: ReferralRow) => <Chip size="small" label={r.code} sx={{ fontWeight: 800 }} />;

/** Read-only referrals log — no handlers, so the columns are static. */
type Translate = ReturnType<typeof useTranslation>['t'];

const columns = (t: Translate): DuncitColumn<ReferralRow>[] => [
  {
    field: 'referrer',
    headerName: t('finance.referrals.referrer'),
    sortable: false,
    flex: 1,
    minWidth: 180,
    valueGetter: referrerValue,
  },
  {
    field: 'referred',
    headerName: t('finance.referrals.referred'),
    sortable: false,
    flex: 1,
    minWidth: 180,
    valueGetter: referredValue,
  },
  {
    field: 'code',
    headerName: t('finance.referrals.code'),
    filter: { type: 'text' },
    minWidth: 130,
    cellRenderer: renderCode,
    valueGetter: (r) => r.code,
  },
  {
    field: 'created_at',
    headerName: t('finance.common.when'),
    filter: { type: 'date' },
    minWidth: 190,
    valueGetter: whenValue,
  },
];

export default function ReferralsTable({ fetchRows }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <DuncitTable<ReferralRow>
      tableId="finance-referrals"
      columns={columns(t)}
      fetchRows={fetchRows}
      getRowId={getReferralRowId}
      emptyText={t('finance.referrals.noReferralsYet')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder="Search referral code"
    />
  );
}
