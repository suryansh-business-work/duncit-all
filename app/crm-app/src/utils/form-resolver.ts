import type { FieldValues, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

/**
 * `zodResolver`, typed for the forms this app writes: every form's input and
 * output are the same shape (no schema here transforms its values), which
 * zodResolver's own generics cannot express. One cast, here, with the reason —
 * the member app makes the same call for the same reason. `any` is
 * react-hook-form's context parameter, which no form here supplies.
 *
 * `raw` hands the submit handler the values as typed instead of the schema's
 * parsed output — for a form whose shared schema checks only some of its
 * fields (the lead editor), so the rest are not stripped on the way out.
 */
/** Any Zod object schema a form here validates with. */
export type FormSchema = Parameters<typeof zodResolver>[0];

export const formResolver = <Values extends FieldValues>(
  schema: FormSchema,
  options: { raw?: boolean } = {},
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Resolver<Values, any, Values> =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (options.raw
    ? zodResolver(schema, undefined, { raw: true })
    : zodResolver(schema)) as unknown as Resolver<Values, any, Values>;
