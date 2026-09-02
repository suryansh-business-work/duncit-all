import { describe, expect, it } from 'vitest';

import {
  SIGNUP_STEPS,
  SIGNUP_STEP_COUNT,
  SIGNUP_STEP_FIELDS,
  buildSignupStepperLabels,
  canLeaveSignupStep,
  firstStepWithError,
  nextSignupStep,
  previousSignupStep,
  signupStepIndex,
  stepSubmitsAccount,
  type SignupStep,
} from '../src/signup-steps';

describe('the step order', () => {
  it('asks who you are, how to reach you, a password, then the code', () => {
    expect(SIGNUP_STEPS).toEqual(['WHO', 'CONTACT', 'SECURITY', 'VERIFY']);
    expect(SIGNUP_STEP_COUNT).toBe(4);
  });

  it('numbers the steps from one', () => {
    expect(signupStepIndex('WHO')).toBe(1);
    expect(signupStepIndex('CONTACT')).toBe(2);
    expect(signupStepIndex('SECURITY')).toBe(3);
    expect(signupStepIndex('VERIFY')).toBe(4);
  });

  it('walks forward one step at a time, and stops at the last', () => {
    expect(nextSignupStep('WHO')).toBe('CONTACT');
    expect(nextSignupStep('CONTACT')).toBe('SECURITY');
    expect(nextSignupStep('SECURITY')).toBe('VERIFY');
    // Nowhere to advance to: a verified number ends signup.
    expect(nextSignupStep('VERIFY')).toBeNull();
  });

  it('walks back one step at a time, and stops at the first', () => {
    expect(previousSignupStep('VERIFY')).toBe('SECURITY');
    expect(previousSignupStep('SECURITY')).toBe('CONTACT');
    expect(previousSignupStep('CONTACT')).toBe('WHO');
    expect(previousSignupStep('WHO')).toBeNull();
  });
});

describe('which step owns which boxes', () => {
  it('gives every step its own fields', () => {
    expect(SIGNUP_STEP_FIELDS.WHO).toEqual(['name', 'dobYear', 'referralCode']);
    expect(SIGNUP_STEP_FIELDS.CONTACT).toEqual(['phoneExtension', 'phoneNumber', 'email']);
    expect(SIGNUP_STEP_FIELDS.SECURITY).toEqual([
      'password',
      'confirmPassword',
      'acceptedPolicyIds',
    ]);
  });

  it('gives the code step none — the server checks that, not the form', () => {
    expect(SIGNUP_STEP_FIELDS.VERIFY).toEqual([]);
  });

  it('claims each field exactly once, so no box is validated by two steps', () => {
    const all = SIGNUP_STEPS.flatMap((step) => SIGNUP_STEP_FIELDS[step]);
    expect(new Set(all).size).toBe(all.length);
  });
});

describe('what a step does when it is left', () => {
  it('creates the account after the password step, and nowhere else', () => {
    expect(stepSubmitsAccount('SECURITY')).toBe(true);
    expect(stepSubmitsAccount('WHO')).toBe(false);
    expect(stepSubmitsAccount('CONTACT')).toBe(false);
    expect(stepSubmitsAccount('VERIFY')).toBe(false);
  });

  it('offers Back only where going back still means something', () => {
    expect(canLeaveSignupStep('WHO')).toBe(false);
    expect(canLeaveSignupStep('CONTACT')).toBe(true);
    expect(canLeaveSignupStep('SECURITY')).toBe(true);
    // The account already exists by VERIFY — Back could only offer to fill in
    // a form that has been spent.
    expect(canLeaveSignupStep('VERIFY')).toBe(false);
  });
});

describe('buildSignupStepperLabels', () => {
  const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
    options?.vars ? `${key}:${JSON.stringify(options.vars)}` : key;
  const labels = buildSignupStepperLabels(t);

  it('reads every static word through the translator', () => {
    expect(labels.next).toBe('mweb.signupSteps.next');
    expect(labels.back).toBe('mweb.signupSteps.back');
    expect(labels.createAccount).toBe('mweb.signupSteps.createAccount');
    expect(labels.creating).toBe('mweb.signupSteps.creating');
    expect(labels.sendCode).toBe('mweb.signupSteps.sendCode');
    expect(labels.sending).toBe('mweb.signupSteps.sending');
    expect(labels.verify).toBe('mweb.signupSteps.verify');
    expect(labels.verifying).toBe('mweb.signupSteps.verifying');
    expect(labels.didntGetIt).toBe('mweb.signupSteps.didntGetIt');
    expect(labels.resend).toBe('mweb.signupSteps.resend');
    expect(labels.skipForNow).toBe('mweb.signupSteps.skipForNow');
  });

  it('passes the values a sentence interpolates', () => {
    expect(labels.stepOf(2, 4)).toBe('mweb.signupSteps.stepOf:{"current":2,"total":4}');
    expect(labels.codeSentTo('+91 9845012345')).toBe(
      'mweb.signupSteps.codeSentTo:{"destination":"+91 9845012345"}',
    );
    expect(labels.testCode('123456')).toBe('mweb.signupSteps.testCode:{"code":"123456"}');
  });

  it('names all four steps', () => {
    expect(labels.step('WHO')).toEqual({
      title: 'mweb.signupSteps.whoTitle',
      subtitle: 'mweb.signupSteps.whoSubtitle',
    });
    expect(labels.step('CONTACT')).toEqual({
      title: 'mweb.signupSteps.contactTitle',
      subtitle: 'mweb.signupSteps.contactSubtitle',
    });
    expect(labels.step('SECURITY')).toEqual({
      title: 'mweb.signupSteps.securityTitle',
      subtitle: 'mweb.signupSteps.securitySubtitle',
    });
    expect(labels.step('VERIFY')).toEqual({
      title: 'mweb.signupSteps.verifyTitle',
      subtitle: 'mweb.signupSteps.verifySubtitle',
    });
  });
});

describe('every step is reachable by the index helper', () => {
  it.each(SIGNUP_STEPS)('%s has a position', (step: SignupStep) => {
    expect(signupStepIndex(step)).toBeGreaterThan(0);
  });
});

describe('firstStepWithError', () => {
  it('names the earliest step holding a broken box', () => {
    expect(firstStepWithError(['password', 'name'])).toBe('WHO');
    expect(firstStepWithError(['password'])).toBe('SECURITY');
    expect(firstStepWithError(['email'])).toBe('CONTACT');
  });

  it('says nothing when nothing is broken', () => {
    expect(firstStepWithError([])).toBeNull();
  });

  it('says nothing about a field no step owns', () => {
    // A field the stepper does not know cannot be navigated to, and guessing
    // a step would send the reader somewhere the message is not.
    expect(firstStepWithError(['somethingElse'])).toBeNull();
  });
});
