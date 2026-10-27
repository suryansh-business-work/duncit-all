import { z } from 'zod';
import { isValidObjectId } from 'mongoose';
import {
  arr,
  date,
  filled,
  gte,
  int,
  lte,
  maxItems,
  maxLen,
  minItems,
  minLen,
  num,
  obj,
  shape,
  str,
  trim,
} from '@utils/zod-fields';
import { PORTAL_REGISTRY } from '@modules/platform/portalMode/portalMode.registry';
import {
  MANUAL_TEST_CASE_TYPES,
  MANUAL_TEST_CATEGORIES,
  MANUAL_TEST_ENVIRONMENTS,
  MANUAL_TEST_LIMITS as L,
  MANUAL_TEST_PRIORITIES,
} from './manualTest.constants';

/** The consoles and apps a case can be about: the platform's own surface registry. */
export const MANUAL_TEST_SURFACES: readonly string[] = PORTAL_REGISTRY.map((entry) => entry.key);

const objectId = (label: string) =>
  z.string().check(z.refine<string>((value) => isValidObjectId(value), { error: `${label} is not a valid id` }));

/** Text that must be there, trimmed, within bounds. */
const requiredText = (min: number, max: number) =>
  str(z.string().check(minLen(min), maxLen(max), filled()), { required: true, transforms: [trim] });

/** The same text, but an update may leave it out. */
const optionalText = (min: number, max: number) =>
  str(z.string().check(minLen(min), maxLen(max), filled()).optional(), { transforms: [trim] });

const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  str(z.enum(values).nullish(), { oneOf: values });

/** Rich-text HTML, bounded, null clears it; stored as the editor produced it. */
const richText = () => str(z.string().check(maxLen(L.richTextMax)).nullish(), { transforms: [trim] });

const stepSchema = obj(
  shape({
    action: requiredText(1, L.stepTextMax),
    expected: str(z.string().check(maxLen(L.stepTextMax)).nullish(), { transforms: [trim], default: '' }),
  })
);

/**
 * Every field a case has besides its title, none of them defaulted: an update
 * names only what it changes, undefined leaves a field alone and null clears it.
 */
const caseFields = {
  type: optionalEnum(MANUAL_TEST_CASE_TYPES),
  priority: optionalEnum(MANUAL_TEST_PRIORITIES),
  column_id: str(objectId('Column').nullish()),
  assignee_id: str(objectId('Assignee').nullish()),
  reporter_id: str(objectId('Reporter').nullish()),
  labels: arr(z.array(requiredText(1, L.labelMax)).check(maxItems(L.labelsMax)).nullish()),
  surface: str(z.string().nullish(), { oneOf: ['', ...MANUAL_TEST_SURFACES], transforms: [trim] }),
  environment: optionalEnum(MANUAL_TEST_ENVIRONMENTS),
  description: richText(),
  preconditions: richText(),
  expected_result: richText(),
  actual_result: richText(),
  steps: arr(z.array(stepSchema).check(maxItems(L.stepsMax)).nullish()),
  e2e_flow_id: str(objectId('E2E flow').nullish()),
  e2e_sub_flow_id: str(objectId('E2E sub flow').nullish()),
  due_date: date(z.date().nullish()),
  estimate_minutes: num(z.number().check(int(), gte(1), lte(L.estimateMax)).nullish()),
};

const SUB_FLOW_NEEDS_FLOW = 'A sub flow can only be linked together with its flow';

/** A new case: a title is all it needs; everything else starts empty. */
export const caseCreateSchema = obj(
  shape(
    { title: requiredText(L.titleMin, L.titleMax), ...caseFields },
    {
      tests: [
        { message: SUB_FLOW_NEEDS_FLOW, test: (value) => !value.e2e_sub_flow_id || Boolean(value.e2e_flow_id) },
      ],
    }
  )
);

/** A partial change to a case. Leaving the flow out keeps the stored one, which the service checks. */
export const caseUpdateSchema = obj(
  shape(
    { title: optionalText(L.titleMin, L.titleMax), ...caseFields },
    {
      tests: [
        { message: SUB_FLOW_NEEDS_FLOW, test: (value) => !value.e2e_sub_flow_id || value.e2e_flow_id !== null },
        {
          message: 'Change at least one field',
          test: (value) => Object.values(value).some((field) => field !== undefined),
        },
      ],
    }
  )
);

export const columnSchema = obj(
  shape({
    name: requiredText(1, L.columnNameMax),
    category: str(z.enum(MANUAL_TEST_CATEGORIES), { oneOf: MANUAL_TEST_CATEGORIES, required: true }),
    wip_limit: num(z.number().check(int(), gte(1), lte(L.wipMax)).nullable(), { default: null }),
  })
);

export const reorderSchema = obj(
  shape({
    ids: arr(z.array(str(objectId('Column'))).check(minItems(1), maxItems(L.columnsMax)), { required: true }),
  })
);

export const commentSchema = obj(shape({ body: requiredText(1, L.commentMax) }));

export const boardFilterSchema = obj(
  shape({
    search: str(z.string().check(maxLen(L.searchMax)).nullish(), { transforms: [trim] }),
    assignee_id: str(objectId('Assignee').nullish()),
    type: optionalEnum(MANUAL_TEST_CASE_TYPES),
    priority: optionalEnum(MANUAL_TEST_PRIORITIES),
    label: str(z.string().check(maxLen(L.labelMax)).nullish(), { transforms: [trim] }),
    surface: str(z.string().nullish(), { oneOf: MANUAL_TEST_SURFACES, transforms: [trim] }),
    environment: optionalEnum(MANUAL_TEST_ENVIRONMENTS),
  })
);

export type CaseCreateInput = z.infer<typeof caseCreateSchema>;
export type CaseUpdateInput = z.infer<typeof caseUpdateSchema>;
export type ColumnInput = z.infer<typeof columnSchema>;
export type ReorderInput = z.infer<typeof reorderSchema>;
export type CommentInput = z.infer<typeof commentSchema>;
export type BoardFilterInput = z.infer<typeof boardFilterSchema>;
