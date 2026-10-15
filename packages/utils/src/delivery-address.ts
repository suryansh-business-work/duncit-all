/**
 * Which saved address the Pod Shop delivers to — the one rule mWeb and the
 * native app share for the header's "Deliver to" pill and the checkout's
 * address picker (CLAUDE.md rules 29 + 56).
 *
 * Only the derivation lives here: each surface keeps the picked id in its own
 * device storage under {@link DELIVERY_ADDRESS_STORAGE_KEY} and renders the
 * choice with its own UI kit.
 */

/** Device-storage key for the address the buyer last picked to deliver to. */
export const DELIVERY_ADDRESS_STORAGE_KEY = 'duncit.delivery_address_id';

/** The address-book fields the choice reads. */
export interface DeliveryAddressLike {
  id: string;
  line1?: string | null;
  city?: string | null;
  pincode?: string | null;
  is_default?: boolean | null;
}

/**
 * The address the shop delivers to: the one the buyer picked while it is still
 * in their book, else their default, else the first. A stale id (deleted
 * address, or another account's pick on a shared device) falls through.
 */
export function pickDeliveryAddress<T extends DeliveryAddressLike>(
  addresses: readonly T[],
  preferredId?: string | null,
): T | null {
  const picked = preferredId ? addresses.find((address) => address.id === preferredId) : undefined;
  return picked ?? addresses.find((address) => address.is_default) ?? addresses[0] ?? null;
}

/** One line naming where it goes: "12 MG Road, Pune 411001". Blank parts drop out. */
export function deliveryAddressLine(address: DeliveryAddressLike): string {
  const place = [address.city, address.pincode]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ');
  return [address.line1?.trim(), place].filter(Boolean).join(', ');
}
