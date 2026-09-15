import * as yup from 'yup';
import { E2E_REVIEW_STATUSES } from './e2eFlow.model';

/** The bounds the Tech portal's forms enforce too — kept equal so a save never fails here first. */
export const E2E_FLOW_LIMITS = {
  nameMin: 2,
  nameMax: 120,
  descriptionMax: 500,
  stepTextMax: 300,
  stepsMax: 100,
} as const;

export const e2eFlowSchema = yup.object({
  name: yup.string().trim().min(E2E_FLOW_LIMITS.nameMin).max(E2E_FLOW_LIMITS.nameMax).required(),
  description: yup.string().trim().max(E2E_FLOW_LIMITS.descriptionMax).nullable().default(''),
});

const stepSchema = yup.object({
  action: yup.string().trim().min(1).max(E2E_FLOW_LIMITS.stepTextMax).required(),
  expected: yup.string().trim().max(E2E_FLOW_LIMITS.stepTextMax).nullable().default(''),
});

export const e2eSubFlowSchema = e2eFlowSchema.shape({
  steps: yup.array(stepSchema).min(1).max(E2E_FLOW_LIMITS.stepsMax).required(),
});

export const e2eReviewSchema = yup.object({
  status: yup.string().oneOf(E2E_REVIEW_STATUSES).required(),
});

export type E2eFlowInput = yup.InferType<typeof e2eFlowSchema>;
export type E2eReviewInput = yup.InferType<typeof e2eReviewSchema>;
export type E2eSubFlowInput = yup.InferType<typeof e2eSubFlowSchema>;
