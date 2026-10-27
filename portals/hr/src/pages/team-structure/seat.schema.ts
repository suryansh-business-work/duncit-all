import { z } from 'zod';
import { EMPLOYMENT_TYPES, NODE_KINDS, NODE_STATUSES, PAY_FREQUENCIES, PAY_KINDS } from './types';

type Translate = (key: string) => string;

/** Number inputs arrive as text; an empty box means "not set". */
const amount = (t: Translate) =>
  z.preprocess(
    (v) => (v === '' || v == null ? undefined : Number(v)),
    z.number({ error: t('hr.teamStructure.validation.amount') }).min(0, t('hr.teamStructure.validation.amount')),
  );
const optionalAmount = (t: Translate) =>
  z.preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().min(0, t('hr.teamStructure.validation.amount')).nullable());

export const makeSeatSchema = (t: Translate) => {
  const payLine = z
    .object({
      label: z.string().trim().min(1, t('hr.teamStructure.validation.payLabel')).max(80),
      kind: z.enum(PAY_KINDS),
      frequency: z.enum(PAY_FREQUENCIES),
      amount: amount(t),
      min_amount: optionalAmount(t),
      max_amount: optionalAmount(t),
      note: z.string().trim().max(240).optional(),
    })
    .superRefine((line, ctx) => {
      if (line.kind !== 'VARIABLE') return;
      const { min_amount: min, max_amount: max } = line;
      if (min == null || max == null || min > max || line.amount < min || line.amount > max) {
        ctx.addIssue({ code: 'custom', path: ['max_amount'], message: t('hr.teamStructure.validation.range') });
      }
    });

  return z.object({
    kind: z.enum(NODE_KINDS),
    title: z.string().trim().min(1, t('hr.teamStructure.validation.title')).max(120),
    person_name: z.string().trim().max(120).optional(),
    department: z.string().trim().max(80).optional(),
    employment_type: z.enum(EMPLOYMENT_TYPES),
    status: z.enum(NODE_STATUSES),
    notes: z.string().trim().max(500).optional(),
    pay: z.array(payLine).max(12),
  });
};

export type SeatFormValues = z.input<ReturnType<typeof makeSeatSchema>>;
export type SeatFormOutput = z.output<ReturnType<typeof makeSeatSchema>>;
