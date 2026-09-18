import { z } from 'zod';

import type { StoreSubscriptionMode } from '../../graphql/autoship';

type Translate = (key: string) => string;

/** How often and how an Autoship runs — shared by "Subscribe & save" and its edit form. */
export const makePlanShape = (t: Translate, frequencies: number[]) => ({
  frequency_weeks: z
    .number()
    .int()
    .refine((weeks) => frequencies.includes(weeks), t('ecommStore.autoship.frequencyInvalid')),
  mode: z.enum(['COD_AUTO', 'REMIND']),
});

export interface PlanValues {
  frequency_weeks: number;
  mode: StoreSubscriptionMode;
}

/** COD_AUTO needs COD switched on; with a phone check configured, it needs a verified phone too. */
export const needsCodCheck = (mode: StoreSubscriptionMode, codRequiresOtp: boolean): boolean =>
  mode === 'COD_AUTO' && codRequiresOtp;
