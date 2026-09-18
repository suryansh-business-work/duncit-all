import { z } from 'zod';

export interface TargetMessages {
  required: string;
  invalid: string;
}

/** A goal is any number of zero or more; the field holds it as typed. */
const isGoal = (value: string) => Number.isFinite(Number(value)) && Number(value) >= 0;

export const targetSchema = (messages: TargetMessages) =>
  z.object({
    goal: z.string().trim().min(1, messages.required).refine(isGoal, messages.invalid),
  });

export type TargetValues = z.infer<ReturnType<typeof targetSchema>>;

export const toTargetValues = (goal: number | null | undefined): TargetValues => ({
  goal: goal === null || goal === undefined ? '' : String(goal),
});

export const toTargetValue = (values: TargetValues): number => Number(values.goal.trim());
