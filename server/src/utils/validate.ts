import { GraphQLError } from 'graphql';
import type { z } from 'zod';
import { messagesOf } from './zod-fields';

const invalid = (errors: string[]) =>
  new GraphQLError('Validation failed', {
    extensions: {
      code: 'BAD_USER_INPUT',
      errors,
    },
  });

export async function validate<T>(schema: z.ZodType<T>, data: unknown): Promise<T> {
  let result: z.ZodSafeParseResult<T>;
  try {
    result = await schema.safeParseAsync(data);
  } catch (err) {
    throw invalid([String(err)]);
  }
  if (!result.success) throw invalid(messagesOf(result.error));
  return result.data;
}
