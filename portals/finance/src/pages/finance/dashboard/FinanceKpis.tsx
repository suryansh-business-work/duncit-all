import { useQuery } from '@apollo/client';
import { Alert, Stack } from '@mui/material';
import { parseApiError } from '../../../utils/parseApiError';
import StatCard from './StatCard';
import {
  PAYMENTS,
  PAYMENT_RELEASE_REQUESTS,
  PUBLIC_FINANCE_SETTINGS,
  type DashboardPayment,
  type DashboardRelease,
} from './queries';

const isThisMonth = (iso: string | null): boolean => {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
};

const sum = (rows: number[]) => rows.reduce((acc, n) => acc + (Number(n) || 0), 0);

/** Live finance KPIs aggregated from real payment + payout data (no dummy values). */
export default function FinanceKpis() {
  const payments = useQuery<{ payments: DashboardPayment[] }>(PAYMENTS, {
    variables: { filter: {}, limit: 500 },
    fetchPolicy: 'cache-and-network',
  });
  const releases = useQuery<{ paymentReleaseRequests: DashboardRelease[] }>(PAYMENT_RELEASE_REQUESTS, {
    variables: { filter: null },
    fetchPolicy: 'cache-and-network',
  });
  const settings = useQuery<{ publicFinanceSettings: { currency_symbol: string } }>(
    PUBLIC_FINANCE_SETTINGS,
    { fetchPolicy: 'cache-first' },
  );

  const error = payments.error || releases.error;
  if (error) return <Alert severity="error">{parseApiError(error)}</Alert>;

  const sym = settings.data?.publicFinanceSettings?.currency_symbol || '₹';
  const fmt = (n: number) => `${sym}${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

  const rows = payments.data?.payments ?? [];
  const success = rows.filter((p) => p.status === 'SUCCESS');
  const successMtd = success.filter((p) => isThisMonth(p.paid_at ?? p.created_at));
  const refundedMtd = rows.filter((p) => p.status === 'REFUNDED' && isThisMonth(p.paid_at ?? p.created_at));

  const grossMtd = sum(successMtd.map((p) => p.total));
  const refundsMtd = sum(refundedMtd.map((p) => p.total));
  const feesAll = sum(success.map((p) => p.platform_fee_amount));
  const gstAll = sum(success.map((p) => p.gst_amount));
  const pendingPayouts = sum(
    (releases.data?.paymentReleaseRequests ?? [])
      .filter((r) => r.status === 'PENDING')
      .map((r) => r.amount_requested),
  );

  const loading = payments.loading || releases.loading;

  return (
    <Stack direction="row" useFlexGap flexWrap="wrap" spacing={2}>
      <StatCard label="Gross Volume (MTD)" value={fmt(grossMtd)} icon="payments" color="primary" loading={loading} hint={`${successMtd.length} successful payments`} />
      <StatCard label="Net Revenue (MTD)" value={fmt(grossMtd - refundsMtd)} icon="insights" color="success" loading={loading} hint="Gross less refunds" />
      <StatCard label="Platform Fees Collected" value={fmt(feesAll)} icon="percent" color="info" loading={loading} hint="All-time, successful" />
      <StatCard label="GST Collected" value={fmt(gstAll)} icon="quote" color="warning" loading={loading} hint="All-time, successful" />
      <StatCard label="Pending Payouts" value={fmt(pendingPayouts)} icon="receipt" color="primary" loading={loading} hint="Awaiting release" />
      <StatCard label="Refunds (MTD)" value={fmt(refundsMtd)} icon="storefront" color="error" loading={loading} hint={`${refundedMtd.length} refunds`} />
    </Stack>
  );
}
