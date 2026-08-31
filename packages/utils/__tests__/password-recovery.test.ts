import { describe, expect, it } from 'vitest';

import { emptyContactDraft } from '../src/contact-change';
import {
  PASSWORD_RECOVERY_CHANNELS,
  PASSWORD_RECOVERY_STEPS,
  PASSWORD_RECOVERY_STEP_COUNT,
  buildPasswordRecoveryLabels,
  initialRecoveryState,
  passwordRecoveryStepIndex,
  previousRecoveryStep,
  recoveryDestination,
  recoveryResendSeconds,
  type PasswordRecoveryStep,
} from '../src/password-recovery';

describe('the recovery channels', () => {
  it('offers exactly the two the server accepts', () => {
    expect(PASSWORD_RECOVERY_CHANNELS).toEqual(['EMAIL', 'PHONE']);
  });
});

describe('the step machine', () => {
  it('numbers the steps from one, and counts only the ones a person fills in', () => {
    expect(PASSWORD_RECOVERY_STEPS).toEqual(['CHANNEL', 'CODE', 'PASSWORD', 'DONE']);
    expect(passwordRecoveryStepIndex('CHANNEL')).toBe(1);
    expect(passwordRecoveryStepIndex('CODE')).toBe(2);
    expect(passwordRecoveryStepIndex('PASSWORD')).toBe(3);
    // DONE is an outcome, not a step to fill in.
    expect(PASSWORD_RECOVERY_STEP_COUNT).toBe(3);
  });

  it('walks back one step at a time', () => {
    expect(previousRecoveryStep('CODE')).toBe('CHANNEL');
    expect(previousRecoveryStep('PASSWORD')).toBe('CODE');
  });

  it('offers no way back from the first step or from success', () => {
    // DONE especially: the password has already changed, and Back there would
    // offer to change it again with a code that has been spent.
    expect(previousRecoveryStep('CHANNEL')).toBeNull();
    expect(previousRecoveryStep('DONE')).toBeNull();
  });
});

describe('initialRecoveryState', () => {
  it('starts on the channel step, on email, with nothing sent yet', () => {
    const state = initialRecoveryState(emptyContactDraft());
    expect(state.step).toBe('CHANNEL');
    expect(state.channel).toBe('EMAIL');
    expect(state.resetToken).toBe('');
    expect(state.lastSentAt).toBeNull();
    expect(state.resendAfterSeconds).toBe(30);
  });

  it('takes the cooldown the caller was told about', () => {
    expect(initialRecoveryState(emptyContactDraft(), 45).resendAfterSeconds).toBe(45);
  });
});

describe('recoveryResendSeconds', () => {
  const now = 1_700_000_000_000;

  it('is zero before anything has been sent', () => {
    expect(recoveryResendSeconds({ lastSentAt: null, resendAfterSeconds: 30 }, now)).toBe(0);
  });

  it('counts down from the send', () => {
    expect(
      recoveryResendSeconds({ lastSentAt: now - 12_000, resendAfterSeconds: 30 }, now),
    ).toBe(18);
  });

  it('never goes below zero once the cooldown has passed', () => {
    expect(
      recoveryResendSeconds({ lastSentAt: now - 90_000, resendAfterSeconds: 30 }, now),
    ).toBe(0);
  });

  it('defaults `now` to the clock, so a caller need not pass one', () => {
    const seconds = recoveryResendSeconds({
      lastSentAt: Date.now() - 5_000,
      resendAfterSeconds: 30,
    });
    expect(seconds).toBeGreaterThan(20);
    expect(seconds).toBeLessThanOrEqual(25);
  });
});

describe('recoveryDestination', () => {
  it('lowercases and trims the address it says back', () => {
    expect(
      recoveryDestination('EMAIL', { email: '  Ravi@Duncit.com ', extension: '', number: '' }),
    ).toBe('ravi@duncit.com');
  });

  it('joins the country code to the number', () => {
    expect(
      recoveryDestination('PHONE', { email: '', extension: '+91', number: '9845012345' }),
    ).toBe('+91 9845012345');
  });

  it('never shows a lone country code', () => {
    expect(recoveryDestination('PHONE', { email: '', extension: '+91', number: '' })).toBe('+91');
  });
});

describe('buildPasswordRecoveryLabels', () => {
  const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
    options?.vars ? `${key}:${JSON.stringify(options.vars)}` : key;
  const labels = buildPasswordRecoveryLabels(t);

  it('reads every static word through the translator', () => {
    expect(labels.chooseTitle).toBe('mweb.passwordRecovery.chooseTitle');
    expect(labels.chooseTitleAccent).toBe('mweb.passwordRecovery.chooseTitleAccent');
    expect(labels.chooseSubtitle).toBe('mweb.passwordRecovery.chooseSubtitle');
    expect(labels.sendCode).toBe('mweb.passwordRecovery.sendCode');
    expect(labels.sending).toBe('mweb.passwordRecovery.sending');
    expect(labels.notFound).toBe('mweb.passwordRecovery.notFound');
    expect(labels.newToDuncit).toBe('mweb.passwordRecovery.newToDuncit');
    expect(labels.createAccount).toBe('mweb.passwordRecovery.createAccount');
    expect(labels.codeTitle).toBe('mweb.passwordRecovery.codeTitle');
    expect(labels.codeTitleAccent).toBe('mweb.passwordRecovery.codeTitleAccent');
    expect(labels.codeLabel).toBe('mweb.passwordRecovery.codeLabel');
    expect(labels.verify).toBe('mweb.passwordRecovery.verify');
    expect(labels.verifying).toBe('mweb.passwordRecovery.verifying');
    expect(labels.didntGetIt).toBe('mweb.passwordRecovery.didntGetIt');
    expect(labels.resend).toBe('mweb.passwordRecovery.resend');
    expect(labels.resending).toBe('mweb.passwordRecovery.resending');
    expect(labels.passwordTitle).toBe('mweb.passwordRecovery.passwordTitle');
    expect(labels.passwordTitleAccent).toBe('mweb.passwordRecovery.passwordTitleAccent');
    expect(labels.passwordSubtitle).toBe('mweb.passwordRecovery.passwordSubtitle');
    expect(labels.savePassword).toBe('mweb.passwordRecovery.savePassword');
    expect(labels.saving).toBe('mweb.passwordRecovery.saving');
    expect(labels.doneTitle).toBe('mweb.passwordRecovery.doneTitle');
    expect(labels.doneTitleAccent).toBe('mweb.passwordRecovery.doneTitleAccent');
    expect(labels.doneSubtitle).toBe('mweb.passwordRecovery.doneSubtitle');
    expect(labels.continueToLogin).toBe('mweb.passwordRecovery.continueToLogin');
    expect(labels.back).toBe('mweb.passwordRecovery.back');
    expect(labels.rememberedIt).toBe('mweb.passwordRecovery.rememberedIt');
    // Shared with the rest of the auth screens rather than duplicated.
    expect(labels.backToLogin).toBe('mweb.auth.backToLogin');
  });

  it('passes the values a sentence interpolates', () => {
    expect(labels.codeSubtitle('+91 9845012345')).toBe(
      'mweb.passwordRecovery.codeSubtitle:{"destination":"+91 9845012345"}',
    );
    expect(labels.codeExpiry(10)).toBe('mweb.passwordRecovery.codeExpiry:{"minutes":10}');
    expect(labels.resendIn(18)).toBe('mweb.passwordRecovery.resendIn:{"seconds":18}');
    expect(labels.testCode('123456')).toBe('mweb.passwordRecovery.testCode:{"code":"123456"}');
    expect(labels.stepOf(2, 3)).toBe('mweb.passwordRecovery.stepOf:{"current":2,"total":3}');
  });

  it('answers for both channels', () => {
    expect(labels.channel('EMAIL')).toEqual({
      name: 'mweb.passwordRecovery.emailName',
      fieldLabel: 'mweb.passwordRecovery.emailField',
      placeholder: 'mweb.passwordRecovery.emailPlaceholder',
      hint: 'mweb.passwordRecovery.emailHint',
    });
    expect(labels.channel('PHONE')).toEqual({
      name: 'mweb.passwordRecovery.phoneName',
      fieldLabel: 'mweb.passwordRecovery.phoneField',
      placeholder: 'mweb.passwordRecovery.phonePlaceholder',
      hint: 'mweb.passwordRecovery.phoneHint',
    });
  });
});

describe('every step is reachable by the index helper', () => {
  it.each(PASSWORD_RECOVERY_STEPS)('%s has a position', (step: PasswordRecoveryStep) => {
    expect(passwordRecoveryStepIndex(step)).toBeGreaterThan(0);
  });
});
