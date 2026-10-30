/**
 * The free justification a host gives when a pod or its venue is free — the
 * same checks as the server's, each reported on its own field. Every assertion
 * is on a KEY.
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  addFreeJustificationIssues,
  freeJustificationDefaults,
  freeJustificationFields,
  type FreeJustificationValues,
} from '../src/schemas';

const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key}:${JSON.stringify(options.vars)}` : key;

/** A form that is always free, as Create Pod's is once "Free" is picked. */
const schema = z.object(freeJustificationFields).superRefine((values, ctx) => addFreeJustificationIssues(values, ctx, t));

const issues = (values: FreeJustificationValues) => {
  const result = schema.safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));
};

describe('addFreeJustificationIssues', () => {
  it('starts empty and unaccepted', () => {
    expect(freeJustificationDefaults).toEqual({ free_reason: '', free_details: '', free_accepted: false });
  });

  it('asks for the reason first, on the reason field', () => {
    expect(issues(freeJustificationDefaults)).toEqual([
      { path: 'free_reason', message: 'availability.freeArrangement.validation.reason:{"max":300}' },
    ]);
  });

  it('asks why on the details field when the reason is "other"', () => {
    expect(issues({ free_reason: 'OTHER', free_details: ' ', free_accepted: true })).toEqual([
      { path: 'free_details', message: 'availability.freeArrangement.validation.details:{"max":300}' },
    ]);
  });

  it('refuses details longer than the server keeps', () => {
    expect(issues({ free_reason: 'CAMPAIGN', free_details: 'x'.repeat(301), free_accepted: true })).toEqual([
      { path: 'free_details', message: 'availability.freeArrangement.validation.detailsTooLong:{"max":300}' },
    ]);
  });

  it('needs the policy accepted, on the checkbox', () => {
    expect(issues({ free_reason: 'INITIATIVE', free_details: '', free_accepted: false })).toEqual([
      { path: 'free_accepted', message: 'availability.freeArrangement.validation.accept:{"max":300}' },
    ]);
  });

  it('passes a complete justification', () => {
    expect(issues({ free_reason: 'PROMOTIONAL', free_details: '', free_accepted: true })).toEqual([]);
    expect(issues({ free_reason: 'OTHER', free_details: 'NGO tie-up', free_accepted: true })).toEqual([]);
  });
});
