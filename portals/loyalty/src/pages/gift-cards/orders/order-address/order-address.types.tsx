import { makeShipToSchema, shipToValues, type ShipToValues } from '@duncit/forms/schemas';
import type { Translator } from '@duncit/app-settings';
import type { GiftCardOrderAddress } from '../queries';

/**
 * A printed order's corrected ship-to — the shared courier rule (@duncit/forms,
 * the one mWeb, native and Partners use; the server refuses the same).
 */
export const makeOrderAddressSchema = (t: Translator['t']) => makeShipToSchema(t);

export type OrderAddressValues = ShipToValues;

export interface OrderAddressFormProps {
  open: boolean;
  address: GiftCardOrderAddress | null;
  busy: boolean;
  errorMessage?: string | null;
  onCancel: () => void;
  onSubmit: (values: OrderAddressValues) => Promise<void> | void;
}

/** Prefill from the order's current ship-to (or a blank one). */
export const orderAddressValues = (address: GiftCardOrderAddress | null): OrderAddressValues => shipToValues(address);
