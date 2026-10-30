import { usePodCheckoutBill } from '../usePodCheckoutBill';
import CheckoutFlow from './CheckoutFlow';
import { useCheckoutContext } from './useCheckoutContext';

/** One pod: ticket gross → multi-ticket tier → Smart Incentive → coupon →
 * coins → GST, the server's order, previewed locally. */
export default function CheckoutPage() {
  const ctx = useCheckoutContext();
  const bill = usePodCheckoutBill({ session: ctx.session, pod: ctx.pod, seats: ctx.seats, linkTotal: ctx.linkTotal });
  return <CheckoutFlow ctx={ctx} bill={bill} />;
}
