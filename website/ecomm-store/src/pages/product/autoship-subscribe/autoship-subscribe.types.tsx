import { z } from 'zod';

import { makeAddressSchema } from '../../../components/address-form';
import { makePlanShape } from '../../../components/autoship-plan';

type Translate = (key: string) => string;

/** A new Autoship: the plan (frequency, mode) plus where it goes. */
export const makeAutoshipSubscribeSchema = (t: Translate, frequencies: number[]) =>
  makeAddressSchema(t).extend(makePlanShape(t, frequencies));

export type AutoshipSubscribeValues = z.infer<ReturnType<typeof makeAutoshipSubscribeSchema>>;
