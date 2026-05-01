import { GraphQLError } from 'graphql';
import type { Schema } from 'yup';

export async function validate<T>(schema: Schema<T>, data: unknown): Promise<T> {
  try {
    return (await schema.validate(data, { abortEarly: false, stripUnknown: true })) as T;
  } catch (err: any) {
    throw new GraphQLError('Validation failed', {
      extensions: {
        code: 'BAD_USER_INPUT',
        errors: err?.errors ?? [String(err)],
      },
    });
  }
}
