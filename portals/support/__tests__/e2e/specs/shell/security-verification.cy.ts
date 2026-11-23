import { LOGIN_MUTATION } from '../../support/operations';
import { portalTokenKey } from '../../support/portals';
import type { RunAccount } from '../../support/run-account';
import { runPasswordNow } from '../../support/ui-shell';
import { gqlRaw, staffAccount } from '../../support/ui-staff';

/**
 * Portal Shell › Security Verification, on Support: the screen every console
 * sign-in ends on before the console opens.
 *
 * It is a server rule, so the first case signs in through the API and asks the
 * server directly: the sign-in token is refused everywhere (it may only ask who
 * it is) until the screen is completed. The rest drive the screen itself — the
 * browser's location is a stub (support/commands.ts), so a fix is always
 * available, and the denial case swaps in one that refuses.
 */

const MY_ACTIVITY = `query E2eMyLoginActivity { myLoginActivity { retention_days } }`;
const ME = `query E2eMe { me { user_id } }`;
const CHALLENGE = `query E2eChallenge { portalSecurityChallenge { reverify detected { ip ip_location_is_approximate } } }`;

const CONFIRMATIONS = ['authorized', 'credentials', 'policies', 'location'] as const;

function signInOnScreen(account: RunAccount, target = '/faqs/submissions'): void {
  cy.clearAuth();
  cy.visitPortal('support', target);
  cy.location('pathname').should('eq', '/login');
  cy.byTestId('field-email').type(account.email);
  cy.byTestId('field-password').type(runPasswordNow(account), { log: false });
  cy.interceptOperation('ConsoleLogin');
  cy.byTestId('login-submit').click();
  cy.wait('@ConsoleLogin').its('response.body.errors').should('be.undefined');
}

/** Make the next location request fail the way a browser does when the person says no. */
function refuseLocation(): void {
  cy.window().then((win) => {
    const stub = win.navigator.geolocation.getCurrentPosition as unknown as {
      callsFake(fake: (ok: unknown, fail: (error: { code: number }) => void) => void): void;
    };
    stub.callsFake((_ok, fail) => fail({ code: 1 }));
  });
}

describe('Portal Shell · Security Verification (Support, run account)', () => {
  let account: RunAccount;

  before(() => {
    account = staffAccount();
  });

  it('SV-01 a console sign-in is not a session: the server refuses it everywhere except for who it is and the screen itself', () => {
    gqlRaw<{ login: { token: string } }>(
      'support',
      LOGIN_MUTATION,
      { input: { email: account.email, password: runPasswordNow(account), portal_key: 'support' } },
      null,
      { verify: false },
    ).then((signIn) => {
      const pending = signIn.data?.login.token ?? null;
      expect(pending, 'the sign-in yields a token').to.be.a('string');

      gqlRaw('support', MY_ACTIVITY, {}, pending, { verify: false }).then((body) => {
        expect(body.errors?.[0]?.extensions?.code, 'an ordinary operation is refused as signed out').to.equal('UNAUTHENTICATED');
      });
      gqlRaw<{ me: { user_id: string } | null }>('support', ME, {}, pending, { verify: false }).then((body) => {
        expect(body.data?.me?.user_id, 'it may still ask who it is').to.be.a('string');
      });
      gqlRaw<{ portalSecurityChallenge: { reverify: boolean; detected: { ip: string; ip_location_is_approximate: boolean } } }>(
        'support',
        CHALLENGE,
        {},
        pending,
        { verify: false },
      ).then((body) => {
        const challenge = body.data?.portalSecurityChallenge;
        expect(challenge?.reverify, 'a first verification, not a repeat').to.equal(false);
        expect(challenge?.detected.ip, 'the server read the address itself').to.be.a('string').and.not.be.empty;
        expect(challenge?.detected.ip_location_is_approximate, 'the place is never presented as a position').to.equal(true);
      });
    });
  });

  it('SV-02 the person meets the screen at the page they asked for, and the button opens only when everything holds', () => {
    signInOnScreen(account);

    cy.location('pathname').should('eq', '/faqs/submissions');
    cy.byTestId('security-warning-banner').should('contain.text', 'SECURITY WARNING:');
    // No console behind it: nothing of the chrome is on the page.
    cy.byTestId('shell-user-menu-button').should('not.exist');
    cy.byTestId('security-detected-ip').invoke('text').should('not.be.empty');
    cy.byTestId('security-detected').should('contain.text', 'Approximate');
    cy.byTestId('security-proceed').should('be.disabled');

    for (const confirmation of CONFIRMATIONS.slice(0, 3)) cy.byTestId(`security-consent-${confirmation}`).click();
    cy.byTestId('security-proceed').should('be.disabled');

    cy.byTestId('security-location-request').click();
    cy.byTestId('security-location-granted').should('be.visible');
    cy.byTestId('security-location-map').should('be.visible');
    // A location is not enough without the person's own consent to share it.
    cy.byTestId('security-proceed').should('be.disabled');

    cy.byTestId('security-consent-location').click();
    cy.byTestId('security-proceed').should('be.enabled');
    cy.interceptOperation('SubmitPortalSecurityVerification');
    cy.byTestId('security-proceed').click();
    cy.wait('@SubmitPortalSecurityVerification').its('response.body.errors').should('be.undefined');

    // Back at the requested page, inside the console, with the new session stored.
    cy.location('pathname').should('eq', '/faqs/submissions');
    cy.byTestId('shell-user-menu-button').should('be.visible');
    cy.window().its('localStorage').invoke('getItem', portalTokenKey('support')).should('be.a', 'string');
  });

  it('SV-03 the same session is not asked again: a reload goes straight to the page', () => {
    signInOnScreen(account, '/faqs');
    cy.completeSecurityVerification();
    cy.byTestId('shell-user-menu-button').should('be.visible');

    cy.reload();
    cy.byTestId('shell-user-menu-button').should('be.visible');
    cy.byTestId('security-proceed').should('not.exist');
  });

  it('SV-04 a refused location is explained and recorded, offers an administrator, and never opens the console', () => {
    signInOnScreen(account);
    refuseLocation();

    cy.byTestId('security-location-request').click();
    cy.byTestId('security-location-failed').should('contain.text', 'Location access was blocked');
    cy.byTestId('security-location-restriction').should('contain.text', 'cannot open this portal without location verification');
    cy.byTestId('security-alternative').should('be.visible');

    // Too short a reason is refused before anything is sent.
    cy.byTestId('security-alternative-reason').find('textarea').first().type('no');
    cy.byTestId('security-alternative-submit').click();
    cy.contains('Tell the administrator why in at least 10 characters').should('be.visible');

    cy.byTestId('security-alternative-reason').find('textarea').first().clear().type('This laptop has no location service installed');
    cy.interceptOperation('RequestPortalSecurityException');
    cy.byTestId('security-alternative-submit').click();
    cy.wait('@RequestPortalSecurityException').its('response.body.errors').should('be.undefined');
    cy.byTestId('security-alternative-pending').should('contain.text', 'Your request is with an administrator');

    // Nothing opens until an administrator decides: the acknowledgements alone are not enough.
    for (const confirmation of CONFIRMATIONS.slice(0, 3)) cy.byTestId(`security-consent-${confirmation}`).click();
    cy.byTestId('security-proceed').should('be.disabled');
    cy.byTestId('shell-user-menu-button').should('not.exist');
  });

  it('SV-05 anyone who should not be here can sign out from the screen, and no session is kept', () => {
    signInOnScreen(account);
    cy.byTestId('security-sign-out').click();
    cy.location('pathname').should('eq', '/login');
    cy.window().its('localStorage').invoke('getItem', portalTokenKey('support')).should('equal', null);
  });
});
