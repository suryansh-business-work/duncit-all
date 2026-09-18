import { z } from 'zod';

import { makeAddressSchema } from '../../../../components/address-form';
import { requiredRule } from '../../../../lib/validation';

type Translate = (key: string) => string;

/** A saved address: the delivery fields, a label ("Home", "Office") and the default flag. */
export const makeAddressBookSchema = (t: Translate) =>
  makeAddressSchema(t).extend({
    label: requiredRule(t, 'ecommStore.validation.labelRequired', 60),
    is_default: z.boolean(),
  });

export type AddressBookValues = z.infer<ReturnType<typeof makeAddressBookSchema>>;
