import { z } from 'zod';
import { FLOW_LIMITS, flowSchema, type FlowMessages } from '../e2e-flow';
import type { E2eSubFlow } from '../queries';

/** A flow's name and description, plus the ordered steps. */
export const subFlowSchema = (messages: FlowMessages) =>
  flowSchema(messages).extend({
    steps: z
      .array(
        z.object({
          action: z
            .string()
            .trim()
            .min(1, messages.actionRequired)
            .max(FLOW_LIMITS.stepTextMax, messages.stepTooLong),
          expected: z.string().trim().max(FLOW_LIMITS.stepTextMax, messages.stepTooLong),
        })
      )
      .min(1, messages.stepsRequired)
      .max(FLOW_LIMITS.stepsMax, messages.stepsTooMany),
  });

export type SubFlowValues = z.infer<ReturnType<typeof subFlowSchema>>;

export const BLANK_STEP: SubFlowValues['steps'][number] = { action: '', expected: '' };

// A new sub flow opens with one empty step: nobody writes a sub flow without one.
export const BLANK_SUB_FLOW: SubFlowValues = { name: '', description: '', steps: [BLANK_STEP] };

/** A stored sub flow, as the form edits it. */
export function toSubFlowValues(subFlow: E2eSubFlow): SubFlowValues {
  return {
    name: subFlow.name,
    description: subFlow.description,
    steps: subFlow.steps.map((step) => ({ action: step.action, expected: step.expected })),
  };
}
