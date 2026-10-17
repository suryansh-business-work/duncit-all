import { useNavigate } from 'react-router';
import { useTranslation } from '../../../i18n/useTranslation';
import { usePodCheckoutBill } from '../usePodCheckoutBill';
import { EmptyCheckout } from './CheckoutFallbacks';
import { useRecurringCheckoutBill } from '../useRecurringCheckoutBill';
import CheckoutFlow from './CheckoutFlow';
import { useCheckoutContext, type CheckoutContext } from './useCheckoutContext';

/** One pod, or one date of a recurring pod: ticket gross → multi-ticket tier →
 * coupon → coins → GST, the server's order, previewed locally. */
function PodCheckout({ ctx }: Readonly<{ ctx: CheckoutContext }>) {
  const bill = usePodCheckoutBill({ session: ctx.session, pod: ctx.pod, seats: ctx.seats, linkTotal: ctx.linkTotal });
  return <CheckoutFlow ctx={ctx} bill={bill} />;
}

/** Several dates of a recurring pod in one go, priced by the server. */
function RecurringCheckout({ ctx }: Readonly<{ ctx: CheckoutContext }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const bill = useRecurringCheckoutBill({
    session: ctx.session,
    pod: ctx.pod,
    podId: ctx.checkoutPodId,
    dateIds: ctx.dateIds,
    seats: ctx.seats,
  });
  // The dates could not be priced (one filled up, the pod changed): say why
  // and send the buyer back to pick again, instead of a bill that never lands.
  if (bill.error && !bill.breakup) {
    return <EmptyCheckout onHome={() => navigate(-1)} title={bill.error.message} action={t('mweb.common.goBack')} />;
  }
  return <CheckoutFlow ctx={ctx} bill={bill} billLoading={bill.loading} />;
}

export default function CheckoutPage() {
  const ctx = useCheckoutContext();
  return ctx.dateIds.length > 0 ? <RecurringCheckout ctx={ctx} /> : <PodCheckout ctx={ctx} />;
}
