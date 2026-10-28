import type { Control } from 'react-hook-form';
import { z } from 'zod';
import { EMPLOYMENT_TYPES, KPI_FREQUENCIES, NODE_KINDS, NODE_STATUSES, PAY_FREQUENCIES, PAY_KINDS } from './types';

type Translate = (key: string) => string;

/** Weights are percentages that must add up to 100; a hair of slack keeps 33.3 + 33.3 + 33.4 valid. */
export const WEIGHT_TOTAL = 100;
const SLACK = 0.01;
export const addsUp = (weights: readonly number[]): boolean =>
  Math.abs(weights.reduce((total, w) => total + w, 0) - WEIGHT_TOTAL) <= SLACK;

/** Number inputs arrive as text; an empty box means "not set". */
const amount = (t: Translate) =>
  z.preprocess(
    (v) => (v === '' || v == null ? undefined : Number(v)),
    z.number({ error: t('hr.teamStructure.validation.amount') }).min(0, t('hr.teamStructure.validation.amount')),
  );
const optionalAmount = (t: Translate) =>
  z.preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().min(0, t('hr.teamStructure.validation.amount')).nullable());

const weight = (t: Translate) =>
  z.preprocess(
    (v) => (v === '' || v == null ? undefined : Number(v)),
    z
      .number({ error: t('hr.teamStructure.validation.weight') })
      .min(0, t('hr.teamStructure.validation.weight'))
      .max(WEIGHT_TOTAL, t('hr.teamStructure.validation.weight')),
  );

/** A target may be any number, or left empty. */
const target = (t: Translate) =>
  z.preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number({ error: t('hr.teamStructure.validation.target') }).nullable());

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

  const kpi = z.object({
    name: z.string().trim().min(1, t('hr.teamStructure.validation.kpiName')).max(120),
    unit: z.string().trim().max(24).optional(),
    target: target(t),
    frequency: z.enum(KPI_FREQUENCIES),
    weight: weight(t),
  });

  const kra = z
    .object({
      title: z.string().trim().min(1, t('hr.teamStructure.validation.kraTitle')).max(120),
      description: z.string().trim().max(500).optional(),
      weight: weight(t),
      kpis: z.array(kpi).max(10),
    })
    .superRefine((area, ctx) => {
      if (area.kpis.length > 0 && !addsUp(area.kpis.map((k) => k.weight))) {
        ctx.addIssue({ code: 'custom', path: ['kpis'], message: t('hr.teamStructure.validation.kpiTotal') });
      }
    });

  return z
    .object({
      kind: z.enum(NODE_KINDS),
      title: z.string().trim().min(1, t('hr.teamStructure.validation.title')).max(120),
      person_name: z.string().trim().max(120).optional(),
      department: z.string().trim().max(80).optional(),
      employment_type: z.enum(EMPLOYMENT_TYPES),
      status: z.enum(NODE_STATUSES),
      notes: z.string().trim().max(500).optional(),
      pay: z.array(payLine).max(12),
      kras: z.array(kra).max(10),
    })
    .superRefine((seat, ctx) => {
      if (seat.kras.length > 0 && !addsUp(seat.kras.map((k) => k.weight))) {
        ctx.addIssue({ code: 'custom', path: ['kras'], message: t('hr.teamStructure.validation.kraTotal') });
      }
    });
};

export type SeatFormValues = z.input<ReturnType<typeof makeSeatSchema>>;
export type SeatFormOutput = z.output<ReturnType<typeof makeSeatSchema>>;

export type SeatControl = Control<SeatFormValues, unknown, SeatFormOutput>;
