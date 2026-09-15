import { GraphQLError } from 'graphql';
import { e2eOverrides } from './e2eRun.mute';
import { e2eSignature, isE2eSignature } from './e2eRun.signature';

/**
 * Google sign-in for the e2e run account, without Google's popup.
 *
 * A live suite cannot drive accounts.google.com — Google refuses automated
 * browsers — so everything after the popup (the server's verification, the
 * policies, the WhatsApp step, the new session) would go untested. While "one-
 * time codes for the run account" is on, this server mints a credential for a
 * RUN ACCOUNT address (`e2eGoogleCredential`), the suite hands it to the app in
 * place of Google's, and `verifyGoogleIdToken` accepts it as Google's answer.
 *
 * Refused for any other address, for any credential this server did not sign,
 * after six hours, and on any server where the switch is off — so production,
 * where it must never be on, never accepts one.
 */

const PREFIX = 'e2e-google';
/** Longer than the slowest full run, short enough that an old credential is dead. */
const LIFETIME_MS = 6 * 60 * 60 * 1000;

interface CredentialBody {
  email: string;
  given_name: string;
  family_name: string;
  /** When it was minted, in ms. */
  iat: number;
}

/** The shape `verifyGoogleIdToken` returns for a real Google token. */
export interface E2eGoogleTokenInfo {
  email: string;
  email_verified: true;
  given_name: string;
  family_name: string;
  name: string;
  sub: string;
  aud: string;
}

const refused = () =>
  new GraphQLError('Invalid Google credential', { extensions: { code: 'UNAUTHENTICATED' } });

/** Whether this address belongs to an e2e run on a server that is an e2e target right now. */
async function isRunAccountOnTarget(email: string): Promise<boolean> {
  const { otpBypass, account } = await e2eOverrides();
  return otpBypass && Boolean(account?.email.test(email));
}

export const isE2eGoogleCredential = (idToken: string): boolean => idToken.startsWith(`${PREFIX}.`);

/** A credential the app can hand to the Google mutations for this run account. */
export async function mintE2eGoogleCredential(input: {
  email: string;
  given_name: string;
  family_name: string;
}): Promise<string> {
  const email = String(input.email ?? '').trim().toLowerCase();
  if (!(await isRunAccountOnTarget(email))) {
    throw new GraphQLError(
      'Google credentials are only minted for an e2e run account, while one-time codes for the run account are on.',
      { extensions: { code: 'FORBIDDEN' } }
    );
  }
  const body: CredentialBody = {
    email,
    given_name: String(input.given_name ?? '').trim(),
    family_name: String(input.family_name ?? '').trim(),
    iat: Date.now(),
  };
  const encoded = Buffer.from(JSON.stringify(body)).toString('base64url');
  return `${PREFIX}.${encoded}.${e2eSignature(PREFIX, encoded)}`;
}

function readBody(encoded: string): CredentialBody | null {
  try {
    return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as CredentialBody;
  } catch {
    return null;
  }
}

/** Accept a stand-in credential exactly where Google's tokeninfo answer would be used. */
export async function verifyE2eGoogleCredential(idToken: string, clientId: string): Promise<E2eGoogleTokenInfo> {
  const [, encoded = '', mac = ''] = idToken.split('.');
  if (!isE2eSignature(PREFIX, encoded, mac)) throw refused();
  const body = readBody(encoded);
  if (!body || Math.abs(Date.now() - body.iat) > LIFETIME_MS) throw refused();
  if (!(await isRunAccountOnTarget(body.email))) throw refused();
  return {
    email: body.email,
    email_verified: true,
    given_name: body.given_name,
    family_name: body.family_name,
    name: `${body.given_name} ${body.family_name}`.trim(),
    // Stable per address, so the account a Google signup created is the one a
    // later Google sign-in finds by `auth.google_id`.
    sub: `e2e:${body.email}`,
    aud: clientId,
  };
}
