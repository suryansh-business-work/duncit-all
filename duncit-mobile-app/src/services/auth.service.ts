import {
  RegisterDocument,
  LoginDocument,
  SignupWithGoogleDocument,
  LoginWithGoogleDocument,
} from '@/graphql/auth';
import { graphqlRequest } from './graphql.client';
import { setAuthToken, clearAuthToken } from './auth-token';

export interface SignupValues {
  name: string;
  birthYear: string;
  email: string;
  password: string;
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

/** Birth year -> Jan 1 of that year as ISO (mirrors mWeb's DobYear handling). */
export function birthYearToDob(year: string): string {
  return new Date(Date.UTC(Number(year), 0, 1)).toISOString();
}

export async function register(values: SignupValues): Promise<AuthOutcome> {
  const { first_name, last_name } = splitName(values.name);
  const data = await graphqlRequest(RegisterDocument, {
    input: {
      first_name,
      last_name,
      email: values.email.trim().toLowerCase(),
      password: values.password,
      dob: birthYearToDob(values.birthYear),
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

/** Token-only Google signup: account created server-side, land on survey. */
export async function signupWithGoogle(idToken: string): Promise<AuthOutcome> {
  const data = await graphqlRequest(SignupWithGoogleDocument, { input: { id_token: idToken } });
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

export async function logout(): Promise<void> {
  await clearAuthToken();
}
