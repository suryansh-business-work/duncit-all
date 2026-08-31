import type { FieldValues, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

/**
 * `zodResolver`, typed for the forms this app actually writes.
 *
 * Every form here declares `useForm<Values, any, Values>` — the input and the
 * output are the same shape, because a Zod schema that transforms its values is
 * something none of them do. `zodResolver`'s own generics do not express that,
 * so all twenty-two call sites wrote the same cast, and prettier wrapping it
 * across five lines is what finally made the duplication gate notice.
 *
 * One cast, in one place, with the reason written down (rule 40). The `any` is
 * react-hook-form's own context parameter, which no form here supplies.
 */
export const formResolver = <Values extends FieldValues>(
  schema: Parameters<typeof zodResolver>[0],
): Resolver<Values, any, Values> => zodResolver(schema) as unknown as Resolver<Values, any, Values>;
