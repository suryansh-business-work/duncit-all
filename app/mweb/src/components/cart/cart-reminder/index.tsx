import { useNavigate } from 'react-router';
import { useProductVisibility } from '@duncit/app-settings';
import ErrorBoundary from '../../ErrorBoundary';
import CartReminderNudge from './CartReminderNudge';
import { useCartNudge } from './useCartNudge';
import { useCartServerSync } from './useCartServerSync';

function CartReminder() {
  const navigate = useNavigate();
  useCartServerSync();
  const nudge = useCartNudge();
  return (
    <CartReminderNudge
      open={nudge.open}
      lines={nudge.lines}
      totalCount={nudge.totalCount}
      hideMs={nudge.hideMs}
      onCheckout={() => {
        nudge.hide();
        navigate('/cart');
      }}
      onHide={nudge.hide}
      onLater={nudge.later}
      onMute={nudge.mute}
    />
  );
}

/**
 * The signed-in cart's background companions: the server mirror the reminder
 * email reads, and the "your cart is calling" nudge. Nothing to buy with
 * products switched off, so nothing runs then. Its own boundary — a fault here
 * must never take the page down with it.
 */
export default function CartReminderHost() {
  const { visible } = useProductVisibility();
  if (!visible) return null;
  return (
    <ErrorBoundary>
      <CartReminder />
    </ErrorBoundary>
  );
}
