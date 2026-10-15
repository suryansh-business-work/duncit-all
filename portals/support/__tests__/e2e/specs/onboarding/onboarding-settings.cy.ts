import type { RunAccount } from '../../support/run-account';
import { countOperation, expectNotSent } from '../../support/ui-staff';
import { onboardingAccount, releaseOnboarding, signInOnboarding } from '../../support/ui-onboarding';

/**
 * Onboarding · Settings (/settings): the Onboarding Intro copy and Duncit's
 * social handles every applicant sees. They are platform settings, so the spec
 * only reads them and drives the form to its Zod refusal — nothing is saved.
 */

const HANDLES = ['x_url', 'instagram_url', 'youtube_url', 'facebook_url', 'website_url'] as const;

type Handles = Record<(typeof HANDLES)[number], string>;

describe('Onboarding · Settings (run account, password CHANGED)', () => {
  let account: RunAccount;

  before(() => {
    account = onboardingAccount();
  });

  after(() => {
    releaseOnboarding(account);
  });

  beforeEach(() => {
    signInOnboarding(account);
  });

  it('OST-01 the social handles show what is stored, and Save stays disabled until something changes', () => {
    cy.interceptOperation('OnboardingIntroSettings');
    cy.visitPortal('onboarding', '/settings');
    cy.wait('@OnboardingIntroSettings').then(({ response }) => {
      const handles = response?.body.data.onboardingIntro.social_handles as Handles;
      for (const key of HANDLES) cy.byTestId(`social-handle-${key}`).find('input').should('have.value', handles[key] ?? '');
    });
    cy.byTestId('onboarding-intro-save').should('be.disabled');
  });

  it('OST-02 a social link that is not a full https:// address is refused on Save before anything is sent', () => {
    const updates = countOperation('UpdateOnboardingIntroSettings');
    cy.interceptOperation('OnboardingIntroSettings');
    cy.visitPortal('onboarding', '/settings');
    cy.wait('@OnboardingIntroSettings');
    cy.byTestId('social-handle-x_url').find('input').clear().type('x.com/duncit', { delay: 0 });
    cy.byTestId('onboarding-intro-save').should('be.enabled').click();
    cy.byTestId('social-handle-x_url').should('contain.text', 'Enter a full link starting with https://');
    cy.byTestId('social-handle-x_url').find('input').should('have.attr', 'aria-invalid', 'true');
    expectNotSent(updates, 'UpdateOnboardingIntroSettings');
  });
});
