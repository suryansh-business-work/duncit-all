import { useMemo } from 'react';
import { DuncitTable, dateColumn, type DuncitColumn, type TableFetch } from '@duncit/table';
import { useDateFormat, useTranslation, type DateFormatter, type Translator } from '@duncit/app-settings';
import { coinCount } from '../duncit-coin/queries';
import PersonCell from '../../components/PersonCell';
import { ConvertedChip, PayoutChip, codeChip, payoutLabels } from './cells';
import type { ReferralRow } from './queries';

const getRowId = (row: ReferralRow) => row.id;

/**
 * `sortable: false` / `filterable: false` on the joined columns is deliberate:
 * the people, the coins and the conversion are read after the page is fetched,
 * so they are not in the server's allowlists. Leaving them on would offer a sort
 * or filter the engine silently drops.
 */
const buildColumns = (t: Translator['t'], formatDateTime: DateFormatter['formatDateTime']): DuncitColumn<ReferralRow>[] => [
  dateColumn<ReferralRow>({
    field: 'created_at',
    headerName: t('loyalty.referrals.colJoined'),
    minWidth: 180,
    hide: false,
    formatDate: formatDateTime,
  }),
  {
    field: 'referrer',
    headerName: t('finance.referrals.referrer'),
    type: 'text',
    sortable: false,
    filterable: false,
    flex: 1,
    minWidth: 200,
    cellRenderer: (r: ReferralRow) => <PersonCell name={r.referrer_name} email={r.referrer_email} id={r.referrer_user_id} />,
    valueGetter: (r) => r.referrer_name || r.referrer_user_id,
  },
  {
    field: 'referred',
    headerName: t('finance.referrals.referred'),
    type: 'text',
    sortable: false,
    filterable: false,
    flex: 1,
    minWidth: 200,
    cellRenderer: (r: ReferralRow) => <PersonCell name={r.referred_name} email={r.referred_email} id={r.referred_user_id} />,
    valueGetter: (r) => r.referred_name || r.referred_user_id,
  },
  {
    field: 'code',
    headerName: t('finance.referrals.code'),
    type: 'text',
    minWidth: 130,
    cellRenderer: (r: ReferralRow) => codeChip(r.code),
    valueGetter: (r) => r.code,
  },
  {
    field: 'referrer_coins',
    headerName: t('loyalty.referrals.colReferrerCoins'),
    type: 'number',
    sortable: false,
    filterable: false,
    minWidth: 140,
    valueGetter: (r) => coinCount(r.referrer_coins),
  },
  {
    field: 'referred_coins',
    headerName: t('loyalty.referrals.colNewMemberCoins'),
    type: 'number',
    sortable: false,
    filterable: false,
    minWidth: 150,
    valueGetter: (r) => coinCount(r.referred_coins),
  },
  {
    field: 'payout_status',
    headerName: t('loyalty.referrals.colPayout'),
    type: 'text',
    sortable: false,
    filterable: false,
    minWidth: 130,
    cellRenderer: (r: ReferralRow) => <PayoutChip status={r.payout_status} t={t} />,
    valueGetter: (r) => payoutLabels(t)[r.payout_status],
  },
  {
    field: 'converted',
    headerName: t('loyalty.referrals.colConverted'),
    type: 'text',
    sortable: false,
    filterable: false,
    minWidth: 150,
    cellRenderer: (r: ReferralRow) => <ConvertedChip converted={r.converted} t={t} />,
    valueGetter: (r) => (r.converted ? t('loyalty.referrals.convertedYes') : t('loyalty.referrals.convertedNo')),
  },
];

/** Who referred whom: every redeemed code, what each side was paid, and whether the newcomer has paid since. */
export default function ReferralsTable({ fetchRows }: Readonly<{ fetchRows: TableFetch<ReferralRow> }>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  // Memoised: DuncitTable rebuilds its column defs whenever this array changes identity.
  const columns = useMemo(() => buildColumns(t, formatDateTime), [t, formatDateTime]);
  return (
    <DuncitTable<ReferralRow>
      ariaLabel={t('loyalty.referrals.historyTitle')}
      tableId="finance-referrals"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      emptyText={t('finance.referrals.noReferralsYet')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      defaultPageSize={10}
      searchPlaceholder={t('loyalty.referrals.historySearch')}
    />
  );
}
