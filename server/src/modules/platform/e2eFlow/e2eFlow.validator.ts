import { z } from 'zod';
import { arr, filled, maxItems, maxLen, minItems, minLen, obj, shape, str, trim } from '@utils/zod-fields';
import { E2E_REVIEW_STATUSES } from './e2eFlow.model';

/** The bounds the Tech portal's forms enforce too — kept equal so a save never fails here first. */
export const E2E_FLOW_LIMITS = {
  nameMin: 2,
  nameMax: 120,
  descriptionMax: 500,
  stepTextMax: 300,
  stepsMax: 100,
} as const;

const optionalNote = (max: number) =>
  str(z.string().check(maxLen(max)).nullable(), { transforms: [trim], default: '' });

const e2eFlowFields = {
  name: str(
    z.string().check(minLen(E2E_FLOW_LIMITS.nameMin), maxLen(E2E_FLOW_LIMITS.nameMax), filled()),
    { required: true, transforms: [trim] }
  ),
  description: optionalNote(E2E_FLOW_LIMITS.descriptionMax),
};

export const e2eFlowSchema = obj(shape(e2eFlowFields));

const stepSchema = obj(
  shape({
    action: str(z.string().check(minLen(1), maxLen(E2E_FLOW_LIMITS.stepTextMax), filled()), {
      required: true,
      transforms: [trim],
    }),
    expected: optionalNote(E2E_FLOW_LIMITS.stepTextMax),
  })
);

export const e2eSubFlowSchema = obj(
  shape({
    ...e2eFlowFields,
    steps: arr(z.array(stepSchema).check(minItems(1), maxItems(E2E_FLOW_LIMITS.stepsMax)), { required: true }),
  })
);

export const e2eReviewSchema = obj(
  shape({ status: str(z.enum(E2E_REVIEW_STATUSES), { oneOf: E2E_REVIEW_STATUSES, required: true }) })
);

export type E2eFlowInput = z.infer<typeof e2eFlowSchema>;
export type E2eReviewInput = z.infer<typeof e2eReviewSchema>;
export type E2eSubFlowInput = z.infer<typeof e2eSubFlowSchema>;
