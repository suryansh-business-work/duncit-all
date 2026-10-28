import { z } from 'zod';
import type { LiteMe } from '../../../../shared/graphql/documents';
import { rules, type Translate } from '../../../lib/validation';

/** Where guests pay a host for a paid ticket: a UPI ID and the payee name their UPI app shows. */
export const makePaymentSchema = (t: Translate) => z.object({ upi_id: rules.optionalUpi(t), upi_name: rules.optional(t, 80) });

export type PaymentValues = z.infer<ReturnType<typeof makePaymentSchema>>;

export const paymentDefaults = (me: LiteMe): PaymentValues => ({ upi_id: me.upi_id ?? '', upi_name: me.upi_name ?? '' });
