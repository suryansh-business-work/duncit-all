import { z } from 'zod';

import { emailRule } from '../../../lib/validation';

type Translate = (key: string) => string;

export const makeStockAlertSchema = (t: Translate) => z.object({ email: emailRule(t) });

export type StockAlertValues = z.infer<ReturnType<typeof makeStockAlertSchema>>;
