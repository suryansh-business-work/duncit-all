import { z } from 'zod';

export interface MembershipBenefitValueInput {
  plan_key: string;
  value: string;
}

export interface MembershipBenefitFormValues {
  group: string;
  label: string;
  values: MembershipBenefitValueInput[];
  sort_order: number;
  is_active: boolean;
}

export const membershipBenefitFormSchema: z.ZodType<
  MembershipBenefitFormValues,
  z.ZodTypeDef,
  unknown
> = z.object({
  group: z
    .string()
    .trim()
    .min(1, 'Section is required')
    .max(60, 'Section must be 60 characters or fewer'),
  label: z
    .string()
    .trim()
    .min(1, 'Benefit is required')
    .max(120, 'Benefit must be 120 characters or fewer'),
  values: z
    .array(
      z.object({
        plan_key: z.string().trim().min(1),
        value: z.string().trim().max(60, 'Each cell must be 60 characters or fewer').default(''),
      })
    )
    .default([]),
  sort_order: z.coerce
    .number()
    .int('Sort order must be a whole number')
    .min(0, 'Sort order must be 0 or greater')
    .max(999, 'Sort order must be 999 or fewer'),
  is_active: z.boolean().default(true),
});

export const membershipBenefitFormDefaults: MembershipBenefitFormValues = {
  group: '',
  label: '',
  values: [],
  sort_order: 0,
  is_active: true,
};

export function toMembershipBenefitInput(values: MembershipBenefitFormValues) {
  const cast = membershipBenefitFormSchema.parse(values);
  return {
    group: cast.group,
    label: cast.label,
    values: cast.values.map((v) => ({ plan_key: v.plan_key, value: v.value })),
    sort_order: Number(cast.sort_order) || 0,
    is_active: cast.is_active,
  };
}

/**
 * One editable cell per ACTIVE plan, seeded from what the row already says.
 *
 * Built from the plan list rather than from the stored values, so a tier added
 * after the row still gets an input — otherwise its column would be
 * uneditable and would render as "not included" forever.
 */
export function buildBenefitValueFields(
  planKeys: readonly string[],
  existing: readonly MembershipBenefitValueInput[]
): MembershipBenefitValueInput[] {
  const byPlan = new Map(existing.map((v) => [v.plan_key, v.value]));
  return planKeys.map((plan_key) => ({ plan_key, value: byPlan.get(plan_key) ?? '' }));
}
