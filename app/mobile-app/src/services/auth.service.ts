import {
  RegisterDocument,
  LoginDocument,
  RequestPasswordResetOtpDocument,
  ResetPasswordWithOtpDocument,
  SignupWithGoogleDocument,
  LinkGoogleAccountDocument,
  LoginWithGoogleDocument,
} from '@/graphql/auth';
// The enum is not re-exported through the generated index, so it is imported
// from the module codegen writes it into — the surface is a server value, and
// spelling it as a bare string would not survive a rename of the enum.
import { PolicyAcceptanceSurface } from '@/generated/graphql/graphql';
import { graphqlRequest } from './graphql.client';
import { setAuthToken, clearAuthToken } from './auth-token';

export interface SignupValues {
  name: string;
  /** YYYY-MM-DD; the server stores a full date. */
  dob: string;
  email: string;
  /** Digits only, without the dial code. Required and unique server-side. */
  phoneNumber: string;
  /** The dial code the number belongs to, e.g. '+91'. */
  phoneExtension: string;
  password: string;
  /** A friend's code, checked by the server BEFORE the account is created. */
  referralCode?: string;
  /** Every policy ticked in the acceptance sheet. Re-verified by the server
   * before the account exists, so a refusal leaves nothing behind. */
  acceptedPolicyIds: string[];
}

export interface LoginValues {
  email: string;
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

export async function register(values: SignupValues): Promise<AuthOutcome> {
  const { first_name, last_name } = splitName(values.name);
  const referralCode = (values.referralCode ?? '').trim().toUpperCase();
  const data = await graphqlRequest(RegisterDocument, {
    input: {
      first_name,
      last_name,
      email: values.email.trim().toLowerCase(),
      phone_number: values.phoneNumber.trim(),
      phone_extension: values.phoneExtension.trim(),
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
  const data = await graphqlRequest(LoginDocument, {
    input: { email: values.email.trim().toLowerCase(), password: values.password },
  });
  await setAuthToken(data.login.token);
  return { token: data.login.token, surveyCompleted: data.login.user.onboarding_survey_completed };
}

/** Request a password-reset OTP by email (mirrors mWeb). Returns whether the
 * email is a registered account — an OTP is only sent when `registered` is true;
 * an unregistered email is reported back so the UI can prompt sign-up. */
export async function requestPasswordResetOtp(email: string): Promise<{ registered: boolean }> {
  const data = await graphqlRequest(RequestPasswordResetOtpDocument, {
    email: email.trim().toLowerCase(),
  });
  return { registered: data.requestPasswordResetOtp.registered ?? false };
}

export interface ResetPasswordValues {
  email: string;
  otp: string;
  new_password: string;
}

/** Verify the OTP and set a new password. Returns true on success. */
export async function resetPasswordWithOtp(values: ResetPasswordValues): Promise<boolean> {
  const data = await graphqlRequest(ResetPasswordWithOtpDocument, {
    input: {
      email: values.email.trim().toLowerCase(),
      otp: values.otp.trim(),
      new_password: values.new_password,
    },
  });
  return data.resetPasswordWithOtp;
}

/**
 * Google signup: account created server-side, land on survey.
 *
 * The accepted policies ride the same input as the token, because this mutation
 * is new-account-only — so the acceptance sheet runs BEFORE it is called and
 * there is no post-signup step to bolt one onto.
 */
export async function signupWithGoogle(
  idToken: string,
  acceptedPolicyIds: string[],
): Promise<AuthOutcome> {
  const data = await graphqlRequest(SignupWithGoogleDocument, {
    input: {
      id_token: idToken,
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
