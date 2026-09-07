/// <reference types="cypress" />

import { createPodFixtures, me, myHost } from '../support/data';

/**
 * Create a Pod — who may open it, and what the stepper does once it opens.
 *
 * The page is one query wide: `CreatePodOptions` carries the clubs, locations,
 * venues, products and the host profile, and two of its fields decide whether
 * anything renders at all. That gate mirrors the server's `createForPartner`
 * check, so getting it wrong here means a host who cannot create a pod or a
 * non-host who can start one the server will refuse.
 */

const STEP_ONE = 'Pod Basics';

describe('Create a pod', () => {
  beforeEach(() => {
    cy.blockThirdParty();
    cy.seedAuth();
  });

  it('opens the stepper for a host, on the first step', () => {
    cy.mockGraphql(createPodFixtures());
    cy.visitApp('/create-pod');

    cy.contains('Create a Pod').should('be.visible');
    cy.contains(STEP_ONE).should('be.visible');
    // The autosave promise is the reason a host can leave mid-way, so the page
    // makes it out loud rather than leaving them to discover it.
    cy.contains('saves automatically').should('be.visible');
  });

  // The gate takes EITHER the cached HOST role or an approved, active profile.
  // A legacy host has the second and not the first, and used to be turned away.
  it('opens the stepper for an approved host who has no HOST role', () => {
    cy.mockGraphql(
      createPodFixtures({
        me: { user_id: me.user_id, roles: ['USER'], selected_location_id: 'loc1' },
      }),
    );
    cy.visitApp('/create-pod');

    cy.contains(STEP_ONE).should('be.visible');
  });

  it('turns away a user who is not a host, and points them at becoming one', () => {
    cy.mockGraphql(
      createPodFixtures({
        me: { user_id: me.user_id, roles: ['USER'], selected_location_id: 'loc1' },
        myHost: null,
      }),
    );
    cy.visitApp('/create-pod');

    cy.contains('An approved host profile is required').should('be.visible');
    cy.contains(STEP_ONE).should('not.exist');
    cy.contains('button', 'Become a host').click();
    cy.location('pathname').should('eq', '/become-host');
  });

  // An approved profile that has been switched off is not an active host, and
  // the server refuses it — the page has to agree.
  it('turns away a host whose profile is inactive', () => {
    cy.mockGraphql(
      createPodFixtures({
        me: { user_id: me.user_id, roles: ['USER'], selected_location_id: 'loc1' },
        myHost: { ...myHost, is_active: false },
      }),
    );
    cy.visitApp('/create-pod');

    cy.contains('An approved host profile is required').should('be.visible');
  });

  it('turns away a host whose application is still pending', () => {
    cy.mockGraphql(
      createPodFixtures({
        me: { user_id: me.user_id, roles: ['USER'], selected_location_id: 'loc1' },
        myHost: { ...myHost, status: 'PENDING' },
      }),
    );
    cy.visitApp('/create-pod');

    cy.contains('An approved host profile is required').should('be.visible');
  });

  it('closes back to Host Management', () => {
    cy.mockGraphql(createPodFixtures());
    cy.visitApp('/create-pod');

    cy.contains(STEP_ONE).should('be.visible');
    // Step 1's optional-settings cards carry a Close of their own, so this is
    // scoped by DOM order rather than by label: the page header renders before
    // the stepper, so the first one is always the page's.
    cy.get('[aria-label="Close"]').first().click();
    cy.location('pathname').should('eq', '/host/manage');
  });

  // A draft is resumed at the step it was left on, which is the whole point of
  // saving one — landing back on step 1 would be indistinguishable from losing it.
  it('resumes a saved draft on the step it was left on', () => {
    cy.mockGraphql({
      ...createPodFixtures(),
      MyPodDraftForEdit: {
        myPodDraft: {
          id: 'draft1',
          step: 1,
          // A STRING: `hydrateDraft` JSON.parse()s this, and an object here
          // throws into its catch and hydrates a blank form instead.
          payload: JSON.stringify({
            pod_title: 'Sunset Jam',
            pod_description: 'An evening of live jazz.',
          }),
        },
      },
    });
    cy.visitApp('/create-pod/draft1');

    cy.contains('Location, Category & Club').should('be.visible');
  });

  it('resumes a draft carrying what was already typed', () => {
    cy.mockGraphql({
      ...createPodFixtures(),
      MyPodDraftForEdit: {
        myPodDraft: {
          id: 'draft1',
          step: 0,
          // A STRING: `hydrateDraft` JSON.parse()s this, and an object here
          // throws into its catch and hydrates a blank form instead.
          payload: JSON.stringify({
            pod_title: 'Sunset Jam',
            pod_description: 'An evening of live jazz.',
          }),
        },
      },
    });
    cy.visitApp('/create-pod/draft1');

    cy.contains(STEP_ONE).should('be.visible');
    // `have.value` reads the property. A controlled MUI input never carries a
    // `value` ATTRIBUTE, so `input[value="…"]` matches nothing however correct
    // the field is.
    cy.fieldByLabel('Pod title').should('have.value', 'Sunset Jam');
  });

  it('shows the reason when the options cannot be read', () => {
    cy.mockGraphql(createPodFixtures());
    // The page renders `options.error.message`, so the failure has to arrive as
    // a GraphQL error rather than as empty data.
    cy.intercept({ method: 'POST', url: '**/graphql' }, (req) => {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const ops = Array.isArray(body) ? body : [body];
      if (ops.some((op) => op?.operationName === 'CreatePodOptions')) {
        req.reply({
          statusCode: 200,
          body: { data: null, errors: [{ message: 'Pod options are unavailable' }] },
        });
        return;
      }
      req.continue();
    });
    cy.visitApp('/create-pod');

    cy.contains('Pod options are unavailable').should('be.visible');
    cy.contains(STEP_ONE).should('not.exist');
  });
});
