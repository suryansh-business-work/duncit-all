import { z } from 'zod';
import { makeShipToSchema, shipToValues } from '@duncit/forms/schemas';
import { EMAIL } from '@duncit/regex';
import type { Translate } from '../../brand-wizard/wizard-steps';
import type { OrderShipTo } from '../orders.queries';

/**
 * The corrected ship-to: the shared courier ship-to rule (@duncit/forms — the
 * one mWeb and the native Studio use, and the server enforces), plus the email
 * the courier notifies, which only this console collects.
 */
export const makeOrderAddressSchema = (t: Translate) =>
  makeShipToSchema(t).extend({
    email: z
      .string()
      .trim()
      .max(254)
      .refine((value) => value === '' || EMAIL.test(value), t('partners.orders.address.emailInvalid')),
  });

export type OrderAddressValues = z.infer<ReturnType<typeof makeOrderAddressSchema>>;

/** Prefill from the order's current ship-to (or a blank one). */
export function orderAddressValues(shipTo: OrderShipTo | null): OrderAddressValues {
  return { ...shipToValues(shipTo), email: shipTo?.email ?? '' };
}
