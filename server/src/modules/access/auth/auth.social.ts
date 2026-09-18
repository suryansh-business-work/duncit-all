import { GraphQLError } from 'graphql';
import { verifyGoogleIdToken } from './auth.google';
import { verifyAppleIdToken } from './auth.apple';

/**
 * The federated sign-in doors — Google and Apple — as the one table the account
 * code reads.
 *
 * Both doors do exactly the same thing with a verified token: find the account
 * the provider's id is linked to, offer to link an email/password account whose
 * address the provider vouched for, or offer to make a new one. That logic is
 * written ONCE in user.service; everything that differs per provider is here.
 */
export type SocialProvider = 'GOOGLE' | 'APPLE';

/** What a verified provider token says about the person — the part Duncit reads. */
export interface SocialIdentity {
  /** The provider's stable id for this person. */
  sub: string;
  /** The address the provider vouched for, lower-cased. */
  email: string;
  given_name?: string;
  family_name?: string;
  name?: string;
  picture?: string;
}

export interface SocialProviderSpec {
  /** As a person reads it, in server messages. */
  label: string;
  verify: (idToken: string) => Promise<SocialIdentity>;
  /** Where the provider's id, the address it vouched for, and the link time live on a user. */
  idPath: string;
  emailPath: string;
  linkedAtPath: string;
  /** The code a verified identity Duncit has no account for is refused with. */
  notFoundCode: string;
  /** How a signup through this door is recorded against each accepted policy. */
  acceptanceMethod: 'GOOGLE_SIGNUP' | 'APPLE_SIGNUP';
  /** Linking refused because the account already holds a different identity from this provider. */
  alreadyLinked: string;
}

export const SOCIAL_PROVIDERS: Readonly<Record<SocialProvider, SocialProviderSpec>> = {
  GOOGLE: {
    label: 'Google',
    verify: async (idToken) => {
      const info = await verifyGoogleIdToken(idToken);
      return { ...info, email: info.email.toLowerCase() };
    },
    idPath: 'auth.google_id',
    emailPath: 'auth.google_email',
    linkedAtPath: 'auth.google_linked_at',
    notFoundCode: 'GOOGLE_ACCOUNT_NOT_FOUND',
    acceptanceMethod: 'GOOGLE_SIGNUP',
    alreadyLinked:
      'This account is already linked to a different Google account. Disconnect it from your profile first.',
  },
  APPLE: {
    label: 'Apple',
    verify: verifyAppleIdToken,
    idPath: 'auth.apple_id',
    emailPath: 'auth.apple_email',
    linkedAtPath: 'auth.apple_linked_at',
    notFoundCode: 'APPLE_ACCOUNT_NOT_FOUND',
    acceptanceMethod: 'APPLE_SIGNUP',
    alreadyLinked: 'This account is already linked to a different Apple ID.',
  },
};

/**
 * The refusal a provider identity Duncit has never seen gets — and the offer
 * that goes with it.
 *
 * Written once because it is thrown from three places that MUST stay
 * word-for-word identical: an unknown account, a sealed one, and a sealed one
 * reached through the link door. Told apart by so much as their wording, they
 * would be a way to ask whether a given address holds an account.
 *
 * The verified address travels in the extensions for the same reason it does on
 * EMAIL_LOGIN_REQUIRED: the caller supplied the token it came out of, so it
 * discloses nothing they did not already hold — and it lets the client's invite
 * name the account it is offering to create rather than talk about it in the
 * abstract.
 */
export function socialAccountNotFound(provider: SocialProvider, email: string): GraphQLError {
  return new GraphQLError('User is not in our system. Please sign up first.', {
    extensions: { code: SOCIAL_PROVIDERS[provider].notFoundCode, email },
  });
}
