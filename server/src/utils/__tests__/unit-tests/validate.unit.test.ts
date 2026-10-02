import { z } from 'zod';
import { GraphQLError } from 'graphql';
import { validate } from '../../validate';
import { finite, gte, num, obj, shape, str } from '../../zod-fields';

const schema = obj(
  shape({
    name: str(z.string(), { required: true }),
    age: num(finite().check(gte(0)), { required: true }),
  })
);

/** A schema stub whose `safeParseAsync` rejects with whatever we want to throw. */
const throwingSchema = (thrown: unknown): z.ZodType<unknown> =>
  ({
    safeParseAsync: async () => {
      throw thrown;
    },
  }) as unknown as z.ZodType<unknown>;

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

  it('throws a BAD_USER_INPUT GraphQLError collecting every failure', async () => {
    expect.assertions(4);
    try {
      // Both fields invalid: name missing + age below the minimum.
      await validate(schema, { age: -5 });
    } catch (err) {
      const gqlErr = err as GraphQLError;
      expect(gqlErr).toBeInstanceOf(GraphQLError);
      expect(gqlErr.message).toBe('Validation failed');
      expect(gqlErr.extensions.code).toBe('BAD_USER_INPUT');
      expect(gqlErr.extensions.errors).toEqual([
        'name is a required field',
        'age must be greater than or equal to 0',
      ]);
    }
  });

  it('falls back to the stringified error when parsing itself throws', async () => {
    expect.assertions(2);
    try {
      await validate(throwingSchema(new Error('boom')), {});
    } catch (err) {
      const gqlErr = err as GraphQLError;
      expect(gqlErr.extensions.code).toBe('BAD_USER_INPUT');
      expect(gqlErr.extensions.errors).toEqual(['Error: boom']);
    }
  });

  it('stringifies a nullish thrown value', async () => {
    expect.assertions(1);
    try {
      await validate(throwingSchema(null), {});
    } catch (err) {
      const gqlErr = err as GraphQLError;
      expect(gqlErr.extensions.errors).toEqual(['null']);
    }
  });
});
