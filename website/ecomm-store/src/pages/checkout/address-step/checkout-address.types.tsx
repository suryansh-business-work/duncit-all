import { z } from 'zod';

import { makeAddressSchema } from '../../../components/address-form';

type Translate = (key: string) => string;

/** The delivery address, plus — for a signed-in shopper — whether to keep it. */
export const makeCheckoutAddressSchema = (t: Translate) => makeAddressSchema(t).extend({ save: z.boolean() });

export type CheckoutAddressValues = z.infer<ReturnType<typeof makeCheckoutAddressSchema>>;
