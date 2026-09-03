/**
 * Joining Duncit, one question at a time — the rules mWeb and the native app
 * share.
 *
 * Signup used to be a single tall form: nine fields, a policy dialog and a
 * separate WhatsApp screen after it. It is four steps now, and the reason the
 * order is what it is: the two steps that cost nothing come first (who you are,
 * how we reach you), the password comes third so it is typed once the person is
 * already committed, and the WhatsApp code is last because it can only be asked
 * for AFTER the account exists — `requestWhatsAppOtp` authenticates the caller.
 *
 * The two surfaces render MUI and Tamagui respectively; what lives here is the
 * step order, which fields each step is answerable for, and every word either
 * one prints (rule 40 — the pair shares LOGIC, never UI).
 *
 * Nothing here validates a shape. Each step is a real form (rule 10: React Hook
 * Form + Zod) and the patterns it checks live in `@duncit/regex`, which this
 * zero-dependency package cannot import.
 */

/**
 * The four steps, in order.
 *
 * ACCOUNT is the one that creates anything: finishing WHO/CONTACT/SECURITY is
 * what calls `register`, and VERIFY is the WhatsApp code checked against the
 * account that now exists.
 */
export const SIGNUP_STEPS = ['WHO', 'CONTACT', 'SECURITY', 'VERIFY'] as const;
export type SignupStep = (typeof SIGNUP_STEPS)[number];

/** The 1-based position of a step, for a stepper's "Step 2 of 4". */
export const signupStepIndex = (step: SignupStep): number => SIGNUP_STEPS.indexOf(step) + 1;

/** How many steps there are. Every one of them is filled in by a person. */
export const SIGNUP_STEP_COUNT = SIGNUP_STEPS.length;

/**
 * Which form fields a step is answerable for.
 *
 * This is what "Next" validates — RHF's `trigger` takes exactly this list — so
 * a step can only be left once its OWN boxes are right, and a field further
 * down never reports an error against a box the person has not reached.
 *
 * VERIFY holds none: the code is checked by the server, not by the form.
 */
export const SIGNUP_STEP_FIELDS: Record<SignupStep, readonly string[]> = {
  WHO: ['name', 'dobYear', 'referralCode'],
  CONTACT: ['phoneExtension', 'phoneNumber', 'whatsappIsMobile', 'email'],
  SECURITY: ['password', 'confirmPassword', 'acceptedPolicyIds'],
  VERIFY: [],
};

/** The step before this one, or null at the first. */
export function previousSignupStep(step: SignupStep): SignupStep | null {
  const at = SIGNUP_STEPS.indexOf(step);
  return at > 0 ? SIGNUP_STEPS[at - 1]! : null;
}

/**
 * The step after this one, or null at the last.
 *
 * Null at VERIFY is not an oversight: there is nowhere to advance TO, because
 * a verified number ends signup and hands the person to the survey.
 */
export function nextSignupStep(step: SignupStep): SignupStep | null {
  const at = SIGNUP_STEPS.indexOf(step);
  return at >= 0 && at < SIGNUP_STEPS.length - 1 ? SIGNUP_STEPS[at + 1]! : null;
}

/**
 * Whether leaving this step creates the account.
 *
 * SECURITY is the last step whose answers `register` needs, so it is the one
 * whose "Next" is really "create my account". Both surfaces branch on this
 * rather than on the step name, so the day a field moves between steps there is
 * one place to move the submit with it.
 */
export const stepSubmitsAccount = (step: SignupStep): boolean => step === 'SECURITY';

/** Whether a step's Back button should exist at all. */
export function canLeaveSignupStep(step: SignupStep): boolean {
  // VERIFY has no way back: the account is already created by the time it
  // shows, so "Back" could only offer to fill in a form that has been spent.
  return step !== 'VERIFY' && previousSignupStep(step) !== null;
}

/**
 * The earliest step holding a field that failed validation, or null.
 *
 * The last step's submit re-checks the WHOLE form, so it can be refused by a
 * box two steps back that the reader cannot see. Both surfaces answer that the
 * same way — go to the step that owns it, so the message is beside the thing it
 * is about — which is why the lookup lives here rather than in each form.
 *
 * Takes the error KEYS rather than react-hook-form's error object, so this
 * package stays framework-free.
 */
export function firstStepWithError(
  errorFields: readonly string[],
): SignupStep | null {
  if (errorFields.length === 0) return null;
  return (
    SIGNUP_STEPS.find((step) =>
      SIGNUP_STEP_FIELDS[step].some((field) => errorFields.includes(field)),
    ) ?? null
  );
}

/** The translator each surface hands in — the same shape as the copy beside it. */
export type SignupTranslate = (
  key: string,
  options?: { vars?: Record<string, string | number> },
) => string;

export interface SignupStepLabels {
  /** The short name in the stepper rail. */
  title: string;
  /** The line under it, saying what this step is for. */
  subtitle: string;
}

export interface SignupStepperLabels {
  step: (step: SignupStep) => SignupStepLabels;
  stepOf: (current: number, total: number) => string;
  next: string;
  back: string;
  /** The button that actually creates the account (end of SECURITY). */
  createAccount: string;
  creating: string;
  /** The last step. */
  sendCode: string;
  sending: string;
  verify: string;
  verifying: string;
  codeSentTo: (destination: string) => string;
  didntGetIt: string;
  resend: string;
  /** Leaving the number unverified — allowed, and the account still exists. */
  skipForNow: string;
  /** The code the server echoes back while no transport can carry it. */
  testCode: (code: string) => string;
  /** The Google door's number step, which has no form behind it. */
  numberTitle: string;
  numberSubtitle: string;
  /** The tick box that decides whether the profile phone is written at all. */
  sameAsMobile: string;
  sameAsMobileHint: string;
}

/*
  Every key below is written as a literal `t('…')`.

  `scripts/verify-translation-keys.mjs` greps source for the literal string, so
  a key assembled from a namespace plus a suffix is reported as
  shipped-but-never-rendered and fails the Shared Gates job. Same shape, and the
  same reason, as buildPasswordRecoveryLabels beside it.
*/
const STEP_LABELS: Record<SignupStep, (t: SignupTranslate) => SignupStepLabels> = {
  WHO: (t) => ({
    title: t('mweb.signupSteps.whoTitle'),
    subtitle: t('mweb.signupSteps.whoSubtitle'),
  }),
  CONTACT: (t) => ({
    title: t('mweb.signupSteps.contactTitle'),
    subtitle: t('mweb.signupSteps.contactSubtitle'),
  }),
  SECURITY: (t) => ({
    title: t('mweb.signupSteps.securityTitle'),
    subtitle: t('mweb.signupSteps.securitySubtitle'),
  }),
  VERIFY: (t) => ({
    title: t('mweb.signupSteps.verifyTitle'),
    subtitle: t('mweb.signupSteps.verifySubtitle'),
  }),
};

/** Every word both signup surfaces render, from one translator. */
export function buildSignupStepperLabels(t: SignupTranslate): SignupStepperLabels {
  return {
    step: (step) => STEP_LABELS[step](t),
    stepOf: (current, total) =>
      t('mweb.signupSteps.stepOf', { vars: { current, total } }),
    next: t('mweb.signupSteps.next'),
    back: t('mweb.signupSteps.back'),
    createAccount: t('mweb.signupSteps.createAccount'),
    creating: t('mweb.signupSteps.creating'),
    sendCode: t('mweb.signupSteps.sendCode'),
    sending: t('mweb.signupSteps.sending'),
    verify: t('mweb.signupSteps.verify'),
    verifying: t('mweb.signupSteps.verifying'),
    codeSentTo: (destination) =>
      t('mweb.signupSteps.codeSentTo', { vars: { destination } }),
    didntGetIt: t('mweb.signupSteps.didntGetIt'),
    resend: t('mweb.signupSteps.resend'),
    skipForNow: t('mweb.signupSteps.skipForNow'),
    testCode: (code) => t('mweb.signupSteps.testCode', { vars: { code } }),
    numberTitle: t('mweb.signupSteps.numberTitle'),
    numberSubtitle: t('mweb.signupSteps.numberSubtitle'),
    sameAsMobile: t('mweb.signupSteps.sameAsMobile'),
    sameAsMobileHint: t('mweb.signupSteps.sameAsMobileHint'),
  };
}
