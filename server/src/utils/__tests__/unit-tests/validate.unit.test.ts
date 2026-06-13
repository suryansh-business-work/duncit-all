import * as yup from 'yup';
import { GraphQLError } from 'graphql';
import { validate } from '../../validate';

const schema = yup.object({
  name: yup.string().required(),
  age: yup.number().required().min(0),
});

/** A schema stub whose `validate` rejects with whatever we want to throw. */
const throwingSchema = (thrown: unknown): yup.Schema<unknown> =>
  ({
    validate: async () => {
      throw thrown;
    },
  }) as unknown as yup.Schema<unknown>;

describe('validate', () => {
  it('returns the validated value and strips unknown keys', async () => {
    const value = await validate(schema, { name: 'Riya', age: 30, extra: 'nope' });
    expect(value).toEqual({ name: 'Riya', age: 30 });
    expect((value as Record<string, unknown>).extra).toBeUndefined();
  });

  it('casts input types per the schema (string number -> number)', async () => {
    const value = await validate(schema, { name: 'Riya', age: '42' });
    expect(value).toEqual({ name: 'Riya', age: 42 });
  });

  it('throws a BAD_USER_INPUT GraphQLError collecting every failure (abortEarly: false)', async () => {
    expect.assertions(4);
    try {
      // Both fields invalid: name missing + age below the minimum.
      await validate(schema, { age: -5 });
    } catch (err) {
      const gqlErr = err as GraphQLError;
      expect(gqlErr).toBeInstanceOf(GraphQLError);
      expect(gqlErr.message).toBe('Validation failed');
      expect(gqlErr.extensions.code).toBe('BAD_USER_INPUT');
      expect((gqlErr.extensions.errors as string[]).length).toBeGreaterThan(1);
    }
  });

  it('falls back to the stringified error when the thrown error has no `errors` array', async () => {
    expect.assertions(2);
    try {
      await validate(throwingSchema(new Error('boom')), {});
    } catch (err) {
      const gqlErr = err as GraphQLError;
      expect(gqlErr.extensions.code).toBe('BAD_USER_INPUT');
      expect(gqlErr.extensions.errors).toEqual(['Error: boom']);
    }
  });

  it('handles a nullish thrown value via the optional chain', async () => {
    expect.assertions(1);
    try {
      await validate(throwingSchema(null), {});
    } catch (err) {
      const gqlErr = err as GraphQLError;
      expect(gqlErr.extensions.errors).toEqual(['null']);
    }
  });
});
