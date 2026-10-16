import {
  DEFAULT_CART_NUDGE_SETTINGS,
  addToWishlist,
  canShowCartNudge,
  cartNudgeDelayMs,
  cartNudgeHideMs,
  deliveryAddressLine,
  pickDeliveryAddress,
  toCartSyncLines,
} from '@duncit/utils';
import { defineDemo, type PackageDemo } from '../../types';

interface CartNudgeMock {
  nudge_enabled: boolean;
  nudge_delay_minutes: number;
  nudge_auto_hide_seconds: number;
  itemCount: number;
  muted: boolean;
  snoozed: boolean;
  route: string;
}

export const cartReminderDemos: PackageDemo[] = [
  defineDemo<CartNudgeMock>({
    id: 'cart-reminder',
    title: 'canShowCartNudge — when "your cart is calling" may appear',
    note: 'Set route to /cart or ProductCheckout and the nudge stays away — the cart is already on screen. muted is "Don’t remind me again", snoozed is "Remind me next time" (off until the next app session). The delay and auto-hide come from Products portal > Cart > Cart Settings. Moving a cart line to the wishlist puts it on top, never twice; a cart sync sends ids and quantity only.',
    mock: {
      ...DEFAULT_CART_NUDGE_SETTINGS,
      itemCount: 3,
      muted: false,
      snoozed: false,
      route: '/home',
    },
    compute: (mock) => {
      const settings = {
        nudge_enabled: mock.nudge_enabled,
        nudge_delay_minutes: mock.nudge_delay_minutes,
        nudge_auto_hide_seconds: mock.nudge_auto_hide_seconds,
      };
      const line = { pod_id: 'DUN-POD-4688', product_id: 'p-7', variant_id: 'xl', quantity: 2 };
      return {
        canShow: canShowCartNudge({ ...mock, settings }),
        nextNudgeInMs: cartNudgeDelayMs(settings),
        hidesAfterMs: cartNudgeHideMs(settings),
        wishlistAfterMove: addToWishlist([], line),
        syncPayload: toCartSyncLines([line]),
      };
    },
  }),
  defineDemo<{ preferredId: string; homeIsDefault: boolean }>({
    id: 'delivery-address',
    title: 'pickDeliveryAddress — where the Pod Shop delivers to',
    note: 'The pick from the shop header’s "Deliver to" pill wins while it is still in the address book; a deleted or another account’s id falls back to the default, then the first address.',
    mock: { preferredId: 'a-office', homeIsDefault: true },
    compute: (mock) => {
      const book = [
        {
          id: 'a-home',
          line1: '12 MG Road',
          city: 'Pune',
          pincode: '411001',
          is_default: mock.homeIsDefault,
        },
        { id: 'a-office', line1: '4 Baner Rd', city: 'Pune', pincode: '411045', is_default: false },
      ];
      const picked = pickDeliveryAddress(book, mock.preferredId);
      return { deliversTo: picked?.id ?? null, line: picked ? deliveryAddressLine(picked) : '' };
    },
  }),
];
