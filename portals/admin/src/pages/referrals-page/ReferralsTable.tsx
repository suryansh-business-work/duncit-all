import { Chip } from '@mui/material';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import type { ReferralRow } from './queries';

interface Props {
  fetchRows: TableFetch<ReferralRow>;
}

const getReferralRowId = (r: ReferralRow) => r.id;

const referrerValue = (r: ReferralRow) => r.referrer_name || r.referrer_user_id;
const referredValue = (r: ReferralRow) => r.referred_name || r.referred_user_id;
const whenValue = (r: ReferralRow) => new Date(r.created_at).toLocaleString();

const renderCode = (r: ReferralRow) => <Chip size="small" label={r.code} sx={{ fontWeight: 800 }} />;

/** Read-only referrals log — no handlers, so the columns are static. */
const COLUMNS: DuncitColumn<ReferralRow>[] = [
  {
    field: 'referrer',
    headerName: 'Referrer',
    sortable: false,
    flex: 1,
    minWidth: 180,
    valueGetter: referrerValue,
  },
  {
    field: 'referred',
    headerName: 'Referred',
    sortable: false,
    flex: 1,
    minWidth: 180,
    valueGetter: referredValue,
  },
  {
    field: 'code',
    headerName: 'Code',
    filter: { type: 'text' },
    minWidth: 130,
    cellRenderer: renderCode,
    valueGetter: (r) => r.code,
  },
  {
    field: 'created_at',
    headerName: 'When',
    filter: { type: 'date' },
    minWidth: 190,
    valueGetter: whenValue,
  },
];

export default function ReferralsTable({ fetchRows }: Readonly<Props>) {
  return (
    <DuncitTable<ReferralRow>
      tableId="admin-referrals"
      columns={COLUMNS}
      fetchRows={fetchRows}
      getRowId={getReferralRowId}
      emptyText="No referrals yet."
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder="Search referral code"
    />
  );
}
