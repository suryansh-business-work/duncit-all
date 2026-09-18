/**
 * The federated sign-in doors — Google and Apple — as the part mWeb and the
 * native app share.
 *
 * Both doors run the same flow on both surfaces: a provider hands back an
 * id_token, the login either opens a session, offers to link an email/password
 * account the provider vouched for, or offers to make a new one — and signup
 * holds the credential unspent until the WhatsApp code answers. What differs
 * per provider is small and lives here, once (rule 40): which refusal means
 * "no Duncit account yet", which copy names the provider, and whether signup
 * has to ask the person's name.
 *
 * Framework-free on purpose: the buttons that obtain a credential are UI and
 * stay in each app.
 */

export type SocialProvider = 'GOOGLE' | 'APPLE';

const PROVIDERS: ReadonlySet<string> = new Set<SocialProvider>(['GOOGLE', 'APPLE']);

/** Whether a value read off navigation is a provider this app knows. */
export const isSocialProvider = (value: unknown): value is SocialProvider =>
  typeof value === 'string' && PROVIDERS.has(value);

/** What a provider hands back from its sign-in. */
export interface SocialCredential {
  provider: SocialProvider;
  /** The id_token the server verifies. */
  idToken: string;
  /**
   * The name Apple shares ONCE, on the first authorisation — it is never in
   * Apple's token. Google's token names the person, so a Google credential
   * never carries one here.
   */
  name?: string;
}

/**
 * The copy keys that name a provider. Spelled out as literals on purpose: the
 * translation gate proves a key is rendered by finding it quoted in source, so
 * a key built from the provider name would read as dead.
 */
export interface SocialAuthCopy {
  /** The signup invite's detail line — what signup still has to ask. */
  notFoundDetail: string;
  /** The link-consent dialog, and what the login screen says after it. */
  linkTitle: string;
  linkBody: string;
  linkDetail: string;
  linkDenied: string;
  linkFailed: string;
  /** The details step's subtitle — what the provider did not share. */
  detailsSubtitle: string;
  /** The policy dialog's intro, shown after the provider returned. */
  policyIntro: string;
}

export const SOCIAL_AUTH_COPY: Readonly<Record<SocialProvider, SocialAuthCopy>> = {
  GOOGLE: {
    notFoundDetail: 'mweb.login.googleNotFoundDetail',
    linkTitle: 'mweb.login.linkConsentTitle',
    linkBody: 'mweb.login.linkConsentBody',
    linkDetail: 'mweb.login.linkConsentDetail',
    linkDenied: 'mweb.login.linkConsentDenied',
    linkFailed: 'mweb.login.linkConsentFailed',
    detailsSubtitle: 'mweb.signup.detailsSubtitle',
    policyIntro: 'policyAcceptance.googleIntro',
  },
  APPLE: {
    notFoundDetail: 'mweb.login.appleNotFoundDetail',
    linkTitle: 'mweb.login.appleLinkConsentTitle',
    linkBody: 'mweb.login.appleLinkConsentBody',
    linkDetail: 'mweb.login.appleLinkConsentDetail',
    linkDenied: 'mweb.login.appleLinkConsentDenied',
    linkFailed: 'mweb.login.appleLinkConsentFailed',
    detailsSubtitle: 'mweb.signup.appleDetailsSubtitle',
    policyIntro: 'policyAcceptance.appleIntro',
  },
};

/**
 * The refusal a provider's login answers with when the provider knows the
 * person and Duncit does not — the one that opens the signup invite.
 */
export const SOCIAL_NOT_FOUND_CODE: Readonly<Record<SocialProvider, string>> = {
  GOOGLE: 'GOOGLE_ACCOUNT_NOT_FOUND',
  APPLE: 'APPLE_ACCOUNT_NOT_FOUND',
};

/**
 * Whether signup has to ask the name itself: an Apple credential that carried
 * none. Apple shares the name once, so a second attempt after an abandoned
 * first one arrives without it — and an account needs one.
 */
export const socialSignupNeedsName = (
  credential: Readonly<Partial<Pick<SocialCredential, 'provider' | 'name'>>> | null,
): boolean => credential?.provider === 'APPLE' && !credential.name?.trim();
