import { z } from 'zod';

import { pincodeRule } from '../../../lib/validation';

type Translate = (key: string) => string;

export const makeDeliveryCheckSchema = (t: Translate) => z.object({ pincode: pincodeRule(t) });

export type DeliveryCheckValues = z.infer<ReturnType<typeof makeDeliveryCheckSchema>>;
