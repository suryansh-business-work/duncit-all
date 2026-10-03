/**
 * The console sign-in documents. Every door hands its answer to the same
 * `acceptSession`, so each must select the token and the same `user { … }` —
 * including a portal's extra user fields — or one door silently skips data the
 * role gate or the redirect reads.
 */
import { describe, expect, it } from 'vitest';
import { Kind, type DocumentNode, type OperationDefinitionNode, type SelectionSetNode } from 'graphql';
import {
  REQUEST_OTP,
  buildCompleteTwoFactorMutation,
  buildLoginMutation,
  buildOtpLoginMutation,
} from '../src/portal-login/login-documents';

const operationOf = (doc: DocumentNode): OperationDefinitionNode => {
  const [definition] = doc.definitions;
  if (definition?.kind !== Kind.OPERATION_DEFINITION) throw new Error('not an operation');
  return definition;
};

const fieldsOf = (set: SelectionSetNode | undefined): string[] =>
  (set?.selections ?? []).flatMap((s) => (s.kind === Kind.FIELD ? [s.name.value] : []));

const childSet = (set: SelectionSetNode | undefined, name: string | undefined):SelectionSetNode | undefined => {
  const field = set?.selections.find((s) => s.kind === Kind.FIELD && s.name.value === name);
  return field?.kind === Kind.FIELD ? field.selectionSet : undefined;
};

/** The root field, its own selection, and the `user { … }` selection under it. */
const shapeOf = (doc: DocumentNode) => {
  const op = operationOf(doc);
  const [root] = fieldsOf(op.selectionSet);
  const rootSet = childSet(op.selectionSet, root);
  return {
    name: op.name?.value,
    operation: op.operation,
    variable: op.variableDefinitions?.map((v) => v.variable.name.value),
    root,
    fields: fieldsOf(rootSet),
    user: fieldsOf(childSet(rootSet, 'user')),
  };
};

const BASE_USER = ['user_id', 'first_name', 'last_name', 'email', 'roles'];

describe('buildLoginMutation', () => {
  it('names the operation as asked and selects the token plus the base user', () => {
    expect(shapeOf(buildLoginMutation('AdminLogin', []))).toEqual({
      name: 'AdminLogin',
      operation: 'mutation',
      variable: ['input'],
      root: 'login',
      fields: ['token', 'user'],
      user: BASE_USER,
    });
  });

  it("adds a portal's extra user fields after the base ones", () => {
    expect(shapeOf(buildLoginMutation('ConsoleLogin', ['onboarding_survey_completed'])).user).toEqual([
      ...BASE_USER,
      'onboarding_survey_completed',
    ]);
  });
});

describe('buildOtpLoginMutation', () => {
  it('trades a code for the same session payload as a password', () => {
    expect(shapeOf(buildOtpLoginMutation(['avatar_url']))).toEqual({
      name: 'ConsoleOtpLogin',
      operation: 'mutation',
      variable: ['input'],
      root: 'loginWithPortalOtp',
      fields: ['token', 'user'],
      user: [...BASE_USER, 'avatar_url'],
    });
  });
});

describe('buildCompleteTwoFactorMutation', () => {
  it('trades the challenge plus the code for the same session payload', () => {
    expect(shapeOf(buildCompleteTwoFactorMutation(['avatar_url']))).toEqual({
      name: 'ConsoleCompleteTwoFactorLogin',
      operation: 'mutation',
      variable: ['input'],
      root: 'completeTwoFactorLogin',
      fields: ['token', 'user'],
      user: [...BASE_USER, 'avatar_url'],
    });
  });
});

describe('REQUEST_OTP', () => {
  it('asks for a sign-in code and reads back only whether it was accepted', () => {
    const shape = shapeOf(REQUEST_OTP);
    expect(shape).toMatchObject({ name: 'ConsoleRequestLoginOtp', root: 'requestPortalLoginOtp', fields: ['ok'] });
  });
});
