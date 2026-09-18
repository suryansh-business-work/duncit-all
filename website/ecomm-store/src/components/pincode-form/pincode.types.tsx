import { z } from 'zod';

import { pincodeRule } from '../../lib/validation';

type Translate = (key: string) => string;

export const makePincodeSchema = (t: Translate) => z.object({ pincode: pincodeRule(t) });

export type PincodeValues = z.infer<ReturnType<typeof makePincodeSchema>>;
