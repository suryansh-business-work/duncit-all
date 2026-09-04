import type { PasswordRecoveryChannel } from '@duncit/utils';
import {
  RegisterDocument,
  LoginDocument,
  CompletePasswordResetDocument,
  LoginWithOtpDocument,
  RequestLoginOtpDocument,
  RequestSignupWhatsAppOtpDocument,
  VerifySignupWhatsAppOtpDocument,
  RequestPasswordResetCodeDocument,
  VerifyPasswordResetCodeDocument,
  SignupWithGoogleDocument,
  LinkGoogleAccountDocument,
  LoginWithGoogleDocument,
} from '@/graphql/auth';
// The enum is not re-exported through the generated index, so it is imported
// from the module codegen writes it into — the surface is a server value, and
// spelling it as a bare string would not survive a rename of the enum.
import { PasswordResetChannel, PolicyAcceptanceSurface } from '@/generated/graphql/graphql';
import { graphqlRequest } from './graphql.client';
import { setAuthToken, clearAuthToken } from './auth-token';

export interface SignupValues {
  name: string;
  /** YYYY-MM-DD; the server stores a full date. */
  dob: string;
  email: string;
  /** The WhatsApp number — digits only, without the dial code. Unique. */
  phoneNumber: string;
  /** The dial code the number belongs to, e.g. '+91'. */
  phoneExtension: string;
  /**
   * The tick box: write the number to the account's phone as well, or leave
   * the profile phone blank because the person's mobile is a different one.
   */
  whatsappIsMobile: boolean;
  password: string;
  /** A friend's code, checked by the server BEFORE the account is created. */
  referralCode?: string;
  /** Every policy ticked in the acceptance sheet. Re-verified by the server
   * before the account exists, so a refusal leaves nothing behind. */
  acceptedPolicyIds: string[];
}

export interface LoginValues {
  /** Which of the two the password is proved against. Defaults to EMAIL. */
  channel?: 'EMAIL' | 'PHONE';
  email: string;
  phoneExtension?: string;
  phoneNumber?: string;
  password: string;
}

/** Normalised result used for post-auth navigation (token + survey gate). */
export interface AuthOutcome {
  token: string;
  surveyCompleted: boolean;
}

/** Split a single "Name" field into first/last; surname may be empty. */
export function splitName(name: string): { first_name: string; last_name?: string } {
  const [first, ...rest] = name.trim().split(/\s+/).filter(Boolean);
  return { first_name: first ?? '', last_name: rest.length ? rest.join(' ') : undefined };
}

/** YYYY-MM-DD -> the ISO instant the server persists. Built in UTC so the day
 * the user picked is the day that is stored, whatever the device timezone. */
export function dobToIso(dob: string): string {
  const [year, month, day] = dob.split('-').map(Number);
  return new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1)).toISOString();
}

export async function register(values: SignupValues, whatsappToken: string): Promise<AuthOutcome> {
  const { first_name, last_name } = splitName(values.name);
  const referralCode = (values.referralCode ?? '').trim().toUpperCase();
  const data = await graphqlRequest(RegisterDocument, {
    input: {
      first_name,
      last_name,
      email: values.email.trim().toLowerCase(),
      phone_number: values.phoneNumber.trim(),
      phone_extension: values.phoneExtension.trim(),
      whatsapp_is_mobile: values.whatsappIsMobile,
      whatsapp_token: whatsappToken,
      password: values.password,
      dob: dobToIso(values.dob),
      // Omitted rather than sent empty: the server treats a present-but-blank
      // code the same way, and an absent field says what happened more plainly.
      ...(referralCode ? { referral_code: referralCode } : {}),
      accepted_policy_ids: values.acceptedPolicyIds,
      accepted_policy_surface: PolicyAcceptanceSurface.App,
    },
  });
  await setAuthToken(data.register.token);
  return {
    token: data.register.token,
    surveyCompleted: data.register.user.onboarding_survey_completed,
  };
}

export async function login(values: LoginValues): Promise<AuthOutcome> {
  /*
    Only the chosen channel travels. Sending a blank email alongside a phone
    number makes the server's per-channel validator argue with a box nobody
    filled in — the same reason toLookupInput exists for recovery.
  */
  const input =
    values.channel === 'PHONE'
      ? {
          channel: PasswordResetChannel.Phone,
          phone_extension: (values.phoneExtension ?? '').trim(),
          phone_number: (values.phoneNumber ?? '').trim(),
          password: values.password,
        }
      : {
          channel: PasswordResetChannel.Email,
          email: values.email.trim().toLowerCase(),
          password: values.password,
        };
  const data = await graphqlRequest(LoginDocument, { input });
  await setAuthToken(data.login.token);
  return { token: data.login.token, surveyCompleted: data.login.user.onboarding_survey_completed };
}

/**
 * What identifies the account across all three recovery steps.
 *
 * One shape rather than one per step, because it is one answer: the destination
 * chosen on step one is what step two proves a code against. Mirrors mWeb's
 * `lookupOf` in usePasswordRecovery.
 */
export interface PasswordResetLookup {
  channel: PasswordRecoveryChannel;
  email?: string;
  phone_extension?: string;
  phone_number?: string;
}

/**
 * The shared channel as the generated enum member.
 *
 * Both are the strings 'EMAIL' and 'PHONE', but codegen emits a real TS enum
 * and a bare string is not assignable to one — the same reason
 * `PolicyAcceptanceSurface` is imported above rather than spelled out. Mapping
 * here keeps the enum out of every screen, which shares its channel type with
 * mWeb through @duncit/utils.
 */
const CHANNEL: Record<PasswordRecoveryChannel, PasswordResetChannel> = {
  EMAIL: PasswordResetChannel.Email,
  PHONE: PasswordResetChannel.Phone,
};

const toLookupInput = (lookup: Readonly<PasswordResetLookup>) => ({
  ...lookup,
  channel: CHANNEL[lookup.channel],
});

export interface PasswordResetRequestOutcome {
  registered: boolean;
  /**
   * Whether a medium actually carried the code. Distinct from `registered`: an
   * account can be found and its code still reach nobody, which is the one
   * outcome the code box must not be shown for.
   */
  sent: boolean;
  resendAfterSeconds: number;
  expiresInMinutes: number;
  /** Echoed back only while no medium could really carry the code. */
  testCode: string | null;
}

/**
 * Step one: send a reset code to the chosen channel.
 *
 * `registered` false means there is no account with these details (or one that
 * signs in with Google and has no password) — nothing was sent, and the screen
 * says so rather than leaving somebody waiting on an empty inbox.
 */
export async function requestPasswordResetCode(
  lookup: PasswordResetLookup,
): Promise<PasswordResetRequestOutcome> {
  const data = await graphqlRequest(RequestPasswordResetCodeDocument, {
    input: toLookupInput(lookup),
  });
  const result = data.requestPasswordResetCode;
  return {
    registered: result.registered,
    // Absent (an older server) reads as sent: a missing field must never be
    // what stops somebody signing in.
    sent: result.sent !== false,
    resendAfterSeconds: result.resend_after_seconds,
    expiresInMinutes: result.expires_in_minutes,
    testCode: result.test_code ?? null,
  };
}

/** Step two: prove the code. Returns the one-shot grant step three spends. */
export async function verifyPasswordResetCode(
  lookup: PasswordResetLookup,
  otp: string,
): Promise<string> {
  const data = await graphqlRequest(VerifyPasswordResetCodeDocument, {
    input: { ...toLookupInput(lookup), otp: otp.trim() },
  });
  return data.verifyPasswordResetCode.reset_token;
}

/** Step three: spend the grant and set the new password. */
export async function completePasswordReset(
  resetToken: string,
  newPassword: string,
): Promise<boolean> {
  const data = await graphqlRequest(CompletePasswordResetDocument, {
    input: { reset_token: resetToken, new_password: newPassword },
  });
  return data.completePasswordReset;
}

/**
 * Continue with OTP, step one: send a sign-in code to the chosen channel.
 * Same lookup, same outcome shape as the recovery request — a different door
 * behind it, which is the server's PURPOSE split, not the client's.
 */
export async function requestLoginOtp(
  lookup: PasswordResetLookup,
): Promise<PasswordResetRequestOutcome> {
  const data = await graphqlRequest(RequestLoginOtpDocument, { input: toLookupInput(lookup) });
  const result = data.requestLoginOtp;
  return {
    registered: result.registered,
    // Absent (an older server) reads as sent: a missing field must never be
    // what stops somebody signing in.
    sent: result.sent !== false,
    resendAfterSeconds: result.resend_after_seconds,
    expiresInMinutes: result.expires_in_minutes,
    testCode: result.test_code ?? null,
  };
}

/** Step two: a correct code signs in — the same outcome a password login has. */
export async function loginWithOtp(lookup: PasswordResetLookup, otp: string): Promise<AuthOutcome> {
  const data = await graphqlRequest(LoginWithOtpDocument, {
    input: { ...toLookupInput(lookup), otp: otp.trim() },
  });
  await setAuthToken(data.loginWithOtp.token);
  return {
    token: data.loginWithOtp.token,
    surveyCompleted: data.loginWithOtp.user.onboarding_survey_completed,
  };
}

/** The WhatsApp number a Google signup proved, and what it is written to. */
export interface ProvenNumber {
  extension: string;
  number: string;
  /** The tick box: also write this to the account's phone, or leave it blank. */
  alsoMobile: boolean;
  /** From verifySignupWhatsAppOtp. Spent here, once. */
  whatsappToken: string;
}

/**
 * Google signup: account created server-side, land on survey.
 *
 * The accepted policies AND the proven number ride the same input as the
 * credential, because this mutation is new-account-only — so the acceptance
 * sheet and the code step both run BEFORE it is called, and there is no
 * post-signup step to bolt either onto.
 */
export async function signupWithGoogle(
  idToken: string,
  acceptedPolicyIds: string[],
  proven: ProvenNumber,
): Promise<AuthOutcome> {
  const data = await graphqlRequest(SignupWithGoogleDocument, {
    input: {
      id_token: idToken,
      phone_number: proven.number.trim(),
      phone_extension: proven.extension.trim(),
      whatsapp_is_mobile: proven.alsoMobile,
      whatsapp_token: proven.whatsappToken,
      accepted_policy_ids: acceptedPolicyIds,
      accepted_policy_surface: PolicyAcceptanceSurface.App,
    },
  });
  await setAuthToken(data.signupWithGoogle.token);
  return {
    token: data.signupWithGoogle.token,
    surveyCompleted: data.signupWithGoogle.user.onboarding_survey_completed,
  };
}

/** Token-only Google login for existing accounts (mirrors mWeb LOGIN_GOOGLE). */
export async function loginWithGoogle(idToken: string): Promise<AuthOutcome> {
  const data = await graphqlRequest(LoginWithGoogleDocument, { input: { id_token: idToken } });
  await setAuthToken(data.loginWithGoogle.token);
  return {
    token: data.loginWithGoogle.token,
    surveyCompleted: data.loginWithGoogle.user.onboarding_survey_completed,
  };
}

/**
 * The "allow" half of the login consent step: grants Google sign-in to an
 * existing email/password account and returns the same session a login would
 * have. Sent with the SAME id_token loginWithGoogle just refused. mWeb twin.
 */
export async function linkGoogleAccount(idToken: string): Promise<AuthOutcome> {
  const data = await graphqlRequest(LinkGoogleAccountDocument, { input: { id_token: idToken } });
  await setAuthToken(data.linkGoogleAccount.token);
  return {
    token: data.linkGoogleAccount.token,
    surveyCompleted: data.linkGoogleAccount.user.onboarding_survey_completed,
  };
}

export async function logout(): Promise<void> {
  await clearAuthToken();
}

/**
 * Signup step four: send the code that proves the WhatsApp number.
 *
 * Public — there is no account yet, and whether there ever is one is what this
 * step decides. The email travels with it so "already in use" is answered here
 * rather than after a code has been typed. Returns the development code while
 * no transport can carry a real one.
 */
export async function requestSignupWhatsAppOtp(
  extension: string,
  number: string,
  email?: string,
): Promise<{ testCode: string | null }> {
  const data = await graphqlRequest(RequestSignupWhatsAppOtpDocument, {
    ext: extension.trim(),
    num: number.trim(),
    email: email?.trim().toLowerCase() ?? null,
  });
  return { testCode: data.requestSignupWhatsAppOtp.dev_otp ?? null };
}

/**
 * Prove the number and receive the one-shot token that creates the account.
 *
 * A wrong code throws, exactly as the server refused it. Nothing is written
 * here: the token is spent by `register` or `signupWithGoogle`.
 */
export async function verifySignupWhatsAppOtp(
  extension: string,
  number: string,
  otp: string,
): Promise<string> {
  const data = await graphqlRequest(VerifySignupWhatsAppOtpDocument, {
    ext: extension.trim(),
    num: number.trim(),
    otp: otp.trim(),
  });
  return data.verifySignupWhatsAppOtp.whatsapp_token;
}
