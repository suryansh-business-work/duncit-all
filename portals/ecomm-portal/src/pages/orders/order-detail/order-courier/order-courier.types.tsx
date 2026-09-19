import { z } from 'zod';
import type { Translate } from '../../../../lib/translate';

/** Mirrors `storeBookShipment(courier_id)`: one of the couriers ShipRocket offered. */
export const makeOrderCourierSchema = (t: Translate) =>
  z.object({
    courier_id: z.string().min(1, t('ecommPortal.shipping.pickCourier')),
  });

export type OrderCourierValues = z.infer<ReturnType<typeof makeOrderCourierSchema>>;

export const ORDER_COURIER_DEFAULTS: OrderCourierValues = { courier_id: '' };
