import { z } from 'zod';

/**
 * A git ref: a branch or tag name. Deliberately permissive about what a name
 * may contain and strict about what git itself forbids — a leading/trailing
 * slash or dot, `..`, whitespace, and the characters git reserves for refspecs.
 */
export const REF_RE = /^(?![/.])(?!.*\.\.)[\w./-]+(?<![/.])$/;

export interface RunTestsMessages {
  refFormat: string;
  suitesRequired: string;
}

export const runTestsSchema = (messages: RunTestsMessages) =>
  z.object({
    // An empty list is what "every suite" looks like on the wire, so the form
    // keeps its own selection non-empty and converts on submit — a picker with
    // nothing ticked reads as a mistake, not as "run all twenty".
    suites: z.array(z.string()).min(1, messages.suitesRequired),
    ref: z.string().trim().regex(REF_RE, messages.refFormat),
  });

export type RunTestsValues = z.infer<ReturnType<typeof runTestsSchema>>;

/**
 * What the mutation is sent. Everything selected means EVERY suite, which the
 * server and the workflow both spell as an empty list — so a suite added later
 * is included by a run that was configured before it existed.
 */
export function toTriggerInput(values: RunTestsValues, total: number) {
  return {
    suites: values.suites.length === total ? [] : values.suites,
    ref: values.ref,
  };
}

/** Adds or removes one suite, keeping the catalogue's own order. */
export function toggleSuite(
  current: readonly string[],
  key: string,
  checked: boolean,
  order: readonly string[]
): string[] {
  if (checked) return order.filter((k) => k === key || current.includes(k));
  return current.filter((k) => k !== key);
}
