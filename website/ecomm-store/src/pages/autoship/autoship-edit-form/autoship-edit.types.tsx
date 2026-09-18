import { z } from 'zod';

import { makeAddressSchema } from '../../../components/address-form';
import { makePlanShape } from '../../../components/autoship-plan';

type Translate = (key: string) => string;

/** Changing an Autoship: how many, how often, how, and where. */
export const makeAutoshipEditSchema = (t: Translate, frequencies: number[], maxQty: number) =>
  makeAddressSchema(t).extend({
    ...makePlanShape(t, frequencies),
    qty: z.number().int().min(1, t('ecommStore.autoship.qtyInvalid')).max(maxQty, t('ecommStore.autoship.qtyInvalid')),
  });

export type AutoshipEditValues = z.infer<ReturnType<typeof makeAutoshipEditSchema>>;
