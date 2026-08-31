import { describe, it, expect } from 'vitest';
import {
  COMPLETE_PASSWORD_RESET,
  REQUEST_PASSWORD_RESET_CODE,
  VERIFY_PASSWORD_RESET_CODE,
} from '../queries';

function firstDefinition(doc: { definitions: readonly unknown[] }) {
  return doc.definitions[0] as {
    kind: string;
    name?: { value: string };
    operation?: string;
    variableDefinitions?: readonly unknown[];
  };
}

describe('forgot-password-page queries module', () => {
  it('exposes RequestPasswordResetCode taking a PasswordResetLookupInput', () => {
    const def = firstDefinition(REQUEST_PASSWORD_RESET_CODE);
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('RequestPasswordResetCode');
    expect((def.variableDefinitions ?? []).length).toBe(1);

    const printed = JSON.stringify(REQUEST_PASSWORD_RESET_CODE);
    expect(printed).toContain('requestPasswordResetCode');
    expect(printed).toContain('PasswordResetLookupInput');
    expect(printed).toContain('registered');
    expect(printed).toContain('resend_after_seconds');
    expect(printed).toContain('expires_in_minutes');
    expect(printed).toContain('test_code');
  });

  it('exposes VerifyPasswordResetCode, which is what yields the grant', () => {
    const def = firstDefinition(VERIFY_PASSWORD_RESET_CODE);
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('VerifyPasswordResetCode');

    const printed = JSON.stringify(VERIFY_PASSWORD_RESET_CODE);
    expect(printed).toContain('verifyPasswordResetCode');
    expect(printed).toContain('VerifyPasswordResetCodeInput');
    expect(printed).toContain('reset_token');
  });

  it('exposes CompletePasswordReset, which spends it', () => {
    const def = firstDefinition(COMPLETE_PASSWORD_RESET);
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('CompletePasswordReset');

    const printed = JSON.stringify(COMPLETE_PASSWORD_RESET);
    expect(printed).toContain('completePasswordReset');
    expect(printed).toContain('CompletePasswordResetInput');
  });

  it('provides three distinct mutation documents', () => {
    const names = [
      REQUEST_PASSWORD_RESET_CODE,
      VERIFY_PASSWORD_RESET_CODE,
      COMPLETE_PASSWORD_RESET,
    ].map((doc) => firstDefinition(doc).name?.value);
    expect(new Set(names).size).toBe(3);
  });
});
