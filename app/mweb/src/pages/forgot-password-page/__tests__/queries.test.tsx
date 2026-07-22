import { describe, it, expect } from 'vitest';
import { REQUEST_PASSWORD_RESET_OTP, RESET_PASSWORD_WITH_OTP } from '../queries';

function firstDefinition(doc: { definitions: readonly unknown[] }) {
  return doc.definitions[0] as {
    kind: string;
    name?: { value: string };
    operation?: string;
    variableDefinitions?: readonly unknown[];
  };
}

describe('forgot-password-page queries module', () => {
  it('exposes RequestPasswordResetOtp mutation with expected fields and variable', () => {
    const def = firstDefinition(REQUEST_PASSWORD_RESET_OTP);
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('RequestPasswordResetOtp');
    expect((def.variableDefinitions ?? []).length).toBe(1);

    const printed = JSON.stringify(REQUEST_PASSWORD_RESET_OTP);
    expect(printed).toContain('requestPasswordResetOtp');
    expect(printed).toContain('email');
    expect(printed).toContain('ok');
    expect(printed).toContain('dev_otp');
    expect(printed).toContain('registered');
  });

  it('exposes ResetPasswordWithOtp mutation taking a ResetPasswordInput', () => {
    const def = firstDefinition(RESET_PASSWORD_WITH_OTP);
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('ResetPasswordWithOtp');
    expect((def.variableDefinitions ?? []).length).toBe(1);

    const printed = JSON.stringify(RESET_PASSWORD_WITH_OTP);
    expect(printed).toContain('resetPasswordWithOtp');
    expect(printed).toContain('ResetPasswordInput');
  });

  it('provides two distinct mutation documents', () => {
    expect(REQUEST_PASSWORD_RESET_OTP).not.toBe(RESET_PASSWORD_WITH_OTP);
    expect(firstDefinition(REQUEST_PASSWORD_RESET_OTP).name?.value).not.toBe(
      firstDefinition(RESET_PASSWORD_WITH_OTP).name?.value,
    );
  });
});
