import { Link as RouterLink } from 'react-router';
import { Link, Stack, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useTranslation, type Translator } from '@duncit/app-settings';
import { urlConfigs } from '../../../../config/url-configs';
import { razorpayDashboardUrl } from '../../../../config/razorpay-dashboard';
import { paymentTracePath } from '../../../../lib/paymentTrace';
import type { FailedPaymentDetail } from '../queries';

interface RelevantLink {
  key: string;
  label: string;
  href: string;
  /** Another site (Razorpay, the Admin console): opens in a new tab. */
  external: boolean;
}

type LinkFacts = Pick<FailedPaymentDetail, 'payment_id' | 'payment_doc_id' | 'pod_id' | 'razorpay_payment_id' | 'razorpay_order_id' | 'refund' | 'user'>;

/**
 * The pages worth opening before deciding, built from the case's own ids —
 * never from the AI's answer, so a link can never point anywhere the case does
 * not. A link whose id the case lacks is left out. Pure, for tests.
 */
export function relevantLinks(t: Translator['t'], d: LinkFacts): RelevantLink[] {
  const links: RelevantLink[] = [
    { key: 'trace', label: t('finance.failedPayments.linkTrace'), href: paymentTracePath(d.payment_id), external: false },
    { key: 'payment', label: t('finance.failedPayments.linkPaymentLog'), href: `/payment-logs/${encodeURIComponent(d.payment_doc_id)}`, external: false },
  ];
  if (d.pod_id) links.push({ key: 'pod', label: t('finance.failedPayments.linkPodFinance'), href: `/pod-finance/${encodeURIComponent(d.pod_id)}`, external: false });
  if (d.razorpay_payment_id) links.push({ key: 'rzp-payment', label: t('finance.failedPayments.linkRazorpayPayment'), href: razorpayDashboardUrl.payment(d.razorpay_payment_id), external: true });
  if (d.razorpay_order_id) links.push({ key: 'rzp-order', label: t('finance.failedPayments.linkRazorpayOrder'), href: razorpayDashboardUrl.order(d.razorpay_order_id), external: true });
  if (d.refund.razorpay_refund_id) links.push({ key: 'rzp-refund', label: t('finance.failedPayments.linkRazorpayRefund'), href: razorpayDashboardUrl.refund(d.refund.razorpay_refund_id), external: true });
  if (d.user.id) links.push({ key: 'user', label: t('finance.failedPayments.linkMember'), href: `${urlConfigs.adminUrl}/users/${encodeURIComponent(d.user.id)}`, external: true });
  return links;
}

/** The case's relevant pages as a list of links. */
export default function RelevantLinks({ detail }: Readonly<{ detail: LinkFacts }>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={0.75} component="nav" aria-label={t('finance.failedPayments.linksTitle')} data-testid="failed-payment-links">
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{t('finance.failedPayments.linksTitle')}</Typography>
      {relevantLinks(t, detail).map((link) =>
        link.external ? (
          <Link
            key={link.key}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            variant="body2"
            aria-label={t('finance.failedPayments.opensNewTab', { vars: { label: link.label } })}
            sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
          >
            {link.label}
            <OpenInNewIcon fontSize="inherit" aria-hidden />
          </Link>
        ) : (
          <Link key={link.key} component={RouterLink} to={link.href} variant="body2">
            {link.label}
          </Link>
        ),
      )}
    </Stack>
  );
}
