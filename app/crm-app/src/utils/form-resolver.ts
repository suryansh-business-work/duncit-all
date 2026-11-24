import type { FieldValues, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

/**
 * `zodResolver`, typed for the forms this app writes: every form's input and
 * output are the same shape (no schema here transforms its values), which
 * zodResolver's own generics cannot express. One cast, here, with the reason —
 * the member app makes the same call for the same reason. `any` is
 * react-hook-form's context parameter, which no form here supplies.
 */
export const formResolver = <Values extends FieldValues>(
  schema: Parameters<typeof zodResolver>[0],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Resolver<Values, any, Values> => zodResolver(schema) as unknown as Resolver<Values, any, Values>;
