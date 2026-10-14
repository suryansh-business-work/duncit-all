import { describe, expect, it } from 'vitest';

import {
  isSocialProvider,
  SOCIAL_AUTH_COPY,
  SOCIAL_NOT_FOUND_CODE,
  SOCIAL_PROMPT_COPY,
  SOCIAL_PROMPT_TEST_IDS,
  socialSignupNeedsName,
} from '../src/social-auth';

describe('isSocialProvider', () => {
  it('knows Google and Apple', () => {
    expect(isSocialProvider('GOOGLE')).toBe(true);
    expect(isSocialProvider('APPLE')).toBe(true);
  });

  it('refuses anything else a navigation param could carry', () => {
    expect(isSocialProvider('FACEBOOK')).toBe(false);
    expect(isSocialProvider(undefined)).toBe(false);
    expect(isSocialProvider(1)).toBe(false);
  });
});

describe('the per-provider pieces', () => {
  it('names the refusal that opens the signup invite', () => {
    expect(SOCIAL_NOT_FOUND_CODE.GOOGLE).toBe('GOOGLE_ACCOUNT_NOT_FOUND');
    expect(SOCIAL_NOT_FOUND_CODE.APPLE).toBe('APPLE_ACCOUNT_NOT_FOUND');
  });

  it('keeps Google on the copy it always had, and gives Apple its own', () => {
    expect(SOCIAL_AUTH_COPY.GOOGLE.linkTitle).toBe('mweb.login.linkConsentTitle');
    expect(SOCIAL_AUTH_COPY.APPLE.linkTitle).toBe('mweb.login.appleLinkConsentTitle');
    expect(SOCIAL_AUTH_COPY.APPLE.policyIntro).toBe('policyAcceptance.appleIntro');
  });
});

describe('socialSignupNeedsName', () => {
  it('asks the name when Apple carried none', () => {
    expect(socialSignupNeedsName({ provider: 'APPLE' })).toBe(true);
    expect(socialSignupNeedsName({ provider: 'APPLE', name: '  ' })).toBe(true);
  });

  it('does not ask when Apple shared it, for Google, or with nothing held', () => {
    expect(socialSignupNeedsName({ provider: 'APPLE', name: 'Riya Sharma' })).toBe(false);
    expect(socialSignupNeedsName({ provider: 'GOOGLE' })).toBe(false);
    expect(socialSignupNeedsName(null)).toBe(false);
  });
});

describe('the details step subtitle', () => {
  /* Regression: both keys once pointed at mweb.signup.*, which ships no such
     entry, so the step printed the raw key. They live with the signup steps. */
  it('names what each provider did not share, from the signup steps copy', () => {
    expect(SOCIAL_AUTH_COPY.GOOGLE.detailsSubtitle).toBe('mweb.signupSteps.detailsSubtitle');
    expect(SOCIAL_AUTH_COPY.APPLE.detailsSubtitle).toBe('mweb.signupSteps.appleDetailsSubtitle');
  });
});

describe('the pre-account prompts', () => {
  it('keeps the login invite on its original copy and test ids', () => {
    expect(SOCIAL_PROMPT_COPY.INVITE.title).toBe('mweb.login.googleNotFoundTitle');
    expect(SOCIAL_PROMPT_TEST_IDS.INVITE.root).toBe('google-signup-invite');
  });

  it('gives the signup door its own log-in-instead copy and test ids', () => {
    expect(SOCIAL_PROMPT_COPY.EXISTS).toEqual({
      title: 'mweb.signup.existingAccountTitle',
      body: 'mweb.signup.existingAccountBody',
      accept: 'mweb.signup.existingAccountLogin',
      dismiss: 'mweb.signup.existingAccountCancel',
    });
    expect(new Set(Object.values(SOCIAL_PROMPT_TEST_IDS.EXISTS)).size).toBe(4);
    expect(Object.values(SOCIAL_PROMPT_TEST_IDS.EXISTS)).not.toContain(SOCIAL_PROMPT_TEST_IDS.INVITE.root);
  });
});
