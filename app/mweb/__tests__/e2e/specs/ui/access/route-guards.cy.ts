/// <reference types="cypress" />
import { openSignedOut } from '../../../support/account-steps';
import { runAccount } from '../../../support/run-account';
import { NO_SUCH_ID, declineTracking, expectSignInFor, signInFromHere } from '../../../support/ui-apps-3';

/**
 * Route guards, live (scenario map › Route guards).
 *
 * `RequireAuth` (app/AuthGuards.tsx) parks a signed-out visitor on /login with
 * the page they asked for as `?redirect` (path, query and hash, URI-encoded),
 * and `RedirectIfAuthed` sends a signed-in member away from the three auth
 * screens. The table below is every kind of signed-in route the app registers
 * (app/AppRoutes/*.tsx): plain `withAuth`, `withProducts` (auth first, then
 * the product flag), partner studios and routes with an id in them. The public
 * pages — a venue and a host page — must render with no session at all.
 */

const GUARDED_PATHS = [
  '/',
  '/menu',
  '/profile',
  '/account',
  '/saved',
  '/search',
  '/contacts',
  '/clubs',
  '/chats',
  '/faqs',
  '/badges',
  '/pod-ideas',
  '/referral',
  '/duncit-coin',
  '/leaderboard',
  '/membership',
  '/gift-cards',
  '/gift-cards/redeem',
  '/pod-plans',
  '/pod-history',
  '/support',
  '/support/tickets',
  '/live-chat',
  '/account/privacy',
  '/verification',
  '/earn',
  '/tour-guide',
  '/create-pod',
  '/host/manage',
  '/host/wallet',
  '/venues/manage',
  '/venues/settings',
  // The Venue Pricing Module; the old /venues/availability redirects here
  // (partnerRoutes.tsx) before any guard runs, so the guard is asked for this path.
  '/venues/pricing',
  '/venues/options',
  '/clubs/manage',
  '/shop',
  '/cart',
  '/orders',
  '/product-checkout',
  '/address-book',
  `/tickets/${NO_SUCH_ID}`,
  `/orders/${NO_SUCH_ID}`,
  `/product/${NO_SUCH_ID}`,
  '/club/e2e-no-such-club',
  '/u/e2e-no-such-handle',
] as const;

describe('Route guards', () => {
  const account = runAccount();

  describe('signed out', () => {
    beforeEach(() => {
      declineTracking();
    });

    GUARDED_PATHS.forEach((path, index) => {
      it(`RG-${String(index + 1).padStart(2, '0')} ${path} sends a signed-out visitor to sign in, keeping the path`, () => {
        openSignedOut(path);
        expectSignInFor(path);
      });
    });

    it('RG-46 the query string travels with the redirect', () => {
      const path = '/support/tickets?from=e2e';
      openSignedOut(path);
      expectSignInFor(path);
    });

    it('RG-47 signing in from the redirect opens the page that was asked for', () => {
      openSignedOut('/saved');
      expectSignInFor('/saved');
      signInFromHere();
      cy.location('pathname').should('eq', '/saved');
      cy.byTestId('saved-screen').should('be.visible');
    });

    it('RG-48 a public venue link renders without a session', () => {
      openSignedOut(`/venue/${NO_SUCH_ID}`);
      cy.location('pathname').should('eq', `/venue/${NO_SUCH_ID}`);
      cy.byTestId('venue-details-missing').should('be.visible');
    });

    it('RG-49 a public host page renders without a session', () => {
      openSignedOut('/hosts/e2e-no-such-host');
      cy.location('pathname').should('eq', '/hosts/e2e-no-such-host');
      cy.byTestId('host-page-not-found').should('be.visible');
    });
  });

  describe('signed in', () => {
    before(() => {
      cy.useRunTraffic();
      cy.apiLogin(account.email, account.password('CHANGED'));
    });

    beforeEach(() => {
      declineTracking();
    });

    (['/login', '/register', '/forgot-password'] as const).forEach((path, index) => {
      it(`RG-${50 + index} ${path} sends a signed-in member home`, () => {
        cy.visitApp(path);
        cy.location('pathname').should('eq', '/');
        cy.byTestId('login-screen').should('not.exist');
      });
    });

    it('RG-53 /login?redirect=/saved sends a signed-in member to the redirect instead', () => {
      cy.visitApp('/login?redirect=%2Fsaved');
      cy.location('pathname').should('eq', '/saved');
      cy.byTestId('saved-screen').should('be.visible');
    });
  });
});
