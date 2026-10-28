import { useMemo } from 'react';
import { DuncitTable, dateColumn, type DuncitColumn, type TableFetch } from '@duncit/table';
import { useDateFormat, useTranslation, type DateFormatter, type Translator } from '@duncit/app-settings';
import { coinCount } from '../duncit-coin/queries';
import PersonCell from '../../components/PersonCell';
import { codeChip, conversionText } from './cells';
import type { ReferrerRow } from './queries';

const getRowId = (row: ReferrerRow) => row.id;

/** The counts are joined after the page is read, so only the code row's own fields sort and filter. */
const buildColumns = (t: Translator['t'], formatDateTime: DateFormatter['formatDateTime']): DuncitColumn<ReferrerRow>[] => [
  {
    field: 'member',
    headerName: t('loyalty.referrals.colMember'),
    type: 'text',
    sortable: false,
    filterable: false,
    flex: 1,
    minWidth: 200,
    cellRenderer: (r: ReferrerRow) => <PersonCell name={r.name} email={r.email} id={r.user_id} />,
    valueGetter: (r) => r.name || r.user_id,
  },
  {
    field: 'code',
    headerName: t('finance.referrals.code'),
    type: 'text',
    minWidth: 130,
    cellRenderer: (r: ReferrerRow) => codeChip(r.code),
    valueGetter: (r) => r.code,
  },
  { field: 'joined', headerName: t('loyalty.referrals.colBroughtIn'), type: 'number', sortable: false, filterable: false, minWidth: 120, valueGetter: (r) => r.joined },
  { field: 'converted', headerName: t('loyalty.referrals.colPaidSince'), type: 'number', sortable: false, filterable: false, minWidth: 120, valueGetter: (r) => r.converted },
  {
    field: 'conversion',
    headerName: t('loyalty.referrals.colConversion'),
    type: 'text',
    sortable: false,
    filterable: false,
    minWidth: 120,
    valueGetter: (r) => conversionText(r.converted, r.joined),
  },
  {
    field: 'coins_earned',
    headerName: t('loyalty.referrals.colCoinsEarned'),
    type: 'number',
    sortable: false,
    filterable: false,
    minWidth: 130,
    valueGetter: (r) => coinCount(r.coins_earned),
  },
  {
    field: 'last_referral_at',
    headerName: t('loyalty.referrals.colLastReferral'),
    type: 'text',
    sortable: false,
    filterable: false,
    minWidth: 180,
    valueGetter: (r) => (r.last_referral_at ? formatDateTime(r.last_referral_at) : t('loyalty.referrals.noSignupsYet')),
  },
  dateColumn<ReferrerRow>({
    field: 'created_at',
    headerName: t('loyalty.referrals.colCodeCreated'),
    minWidth: 180,
    hide: false,
    formatDate: formatDateTime,
  }),
];

/** Every member's code and what it brought in — a code nobody has used yet is a member still waiting on their first signup. */
export default function ReferrersTable({ fetchRows }: Readonly<{ fetchRows: TableFetch<ReferrerRow> }>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const columns = useMemo(() => buildColumns(t, formatDateTime), [t, formatDateTime]);
  return (
    <DuncitTable<ReferrerRow>
      ariaLabel={t('loyalty.referrals.referrersTitle')}
      tableId="loyalty-referrers"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      emptyText={t('loyalty.referrals.referrersEmpty')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      defaultPageSize={10}
      searchPlaceholder={t('loyalty.referrals.historySearch')}
    />
  );
}
