/// <reference types="cypress" />
import { EARN_JOURNEYS } from '@duncit/onboarding';
import { LAUNCH_ROLE_SECTIONS, formatCount } from '@duncit/utils';
import { refusal } from '../../../support/api-apps';
import { expectRefused, signInRunMember } from '../../../support/access-steps';
import {
  appLocations,
  notice,
  runMe,
  selectLocation,
  signInOnLoginPage,
  watchClipboard,
  type AppLocation,
} from '../../../support/ui-apps-2';
import { runAccount } from '../../../support/run-account';

/**
 * City launch waitlist (UI), live on staging, as the run account.
 *
 * A city an admin has added but not launched is read from the header's own
 * `locations` query; the spec fails up front when staging has none. The run
 * account adds its name to that city's waitlist (a row purged with the
 * account) and changes its saved header city through the picker, which
 * `after()` puts back.
 */

const STATUS = `query E2eUiCityLaunchStatus($id: ID!) {
  locationLaunchStatus(location_doc_id: $id) { subscriber_count launch_target is_subscribed }
}`;
const SUBSCRIBE = `mutation E2eUiSubscribeCityLaunch($id: ID!) {
  subscribeLocationLaunch(location_doc_id: $id, location_shared: false) { subscriber_count is_subscribed }
}`;

interface LaunchStatus {
  subscriber_count: number;
  launch_target: number;
  is_subscribed: boolean;
}

/** The three role screens' headlines (mweb.cityLaunch.hostTitle / venueTitle / volunteerTitle). */
const ROLE_TITLES: Record<string, string> = {
  'city-launch-card-host': 'Want to host your own Pods?',
  'city-launch-card-venue': 'Turn your space into a community',
  'city-launch-card-club-admin': 'Run your own Club.',
};

const launchStatus = (id: string) =>
  cy.gql<{ locationLaunchStatus: LaunchStatus }>(STATUS, { id }).then((data) => data.locationLaunchStatus);

/** Open the standalone waitlist page and wait for its status to land. */
function openLaunchPage(slug: string): void {
  cy.interceptOperation('CityLaunchStatus');
  cy.visitApp(`/city-launch/${slug}`);
  cy.wait('@CityLaunchStatus');
}

/** In the open location picker, drill to the city's country and state, then pick it. */
function pickCity(city: AppLocation): void {
  cy.byTestId(`country-state-picker-country-${city.country?.trim() || 'Other'}`).click();
  cy.byTestId(`country-state-picker-state-${city.state?.trim() || 'Other'}`).click();
  cy.byTestId(`location-${city.id}-select`).click();
}

function applyPickedCity(): void {
  cy.interceptOperation('SetMySelectedLocation');
  cy.byTestId('location-dialog-apply').click();
  cy.wait('@SetMySelectedLocation');
}

describe('City launch', { testIsolation: false }, () => {
  const account = runAccount();
  let waitlisted: AppLocation;
  let launched: AppLocation;
  let savedLocationId: string | null = null;

  before(() => {
    signInRunMember();
    runMe().then((me) => {
      savedLocationId = me.selected_location_id;
    });
    appLocations().then((locations) => {
      const open = locations.find((location) => !location.is_launched);
      const live = locations.find((location) => location.is_launched);
      if (!open) throw new Error('Staging has no unlaunched city (Admin > Locations, Launched off): the waitlist scenarios need one.');
      if (!live) throw new Error('Staging has no launched city: the picker scenario needs one to return to.');
      waitlisted = open;
      launched = live;
    });
  });

  after(() => {
    // The signed-out scenario dropped the API token; sign in again to put the saved city back.
    signInRunMember();
    cy.then(() => selectLocation(savedLocationId));
  });

  it('CL-01 a city that is not on Duncit says so', () => {
    openLaunchPage(`e2e-nowhere-${account.stamp}`);
    cy.byTestId('city-launch-not-found').should('have.text', 'This city is not on Duncit.');
    cy.byTestId('city-launch-hero').should('not.exist');
  });

  it('CL-02 the picker shows the unlaunched city as Coming soon, and choosing it puts the waitlist in Home’s place', () => {
    cy.visitApp('/');
    cy.byTestId('header-location').click();
    cy.byTestId('location-dialog').should('be.visible');
    pickCity(waitlisted);
    cy.byTestId(`location-${waitlisted.id}`).within(() => {
      cy.byTestId('city-tile-coming-soon').should('have.text', 'Coming soon');
      cy.byTestId('city-tile-people-in').should('contain.text', String(waitlisted.subscriber_count));
    });
    applyPickedCity();
    cy.byTestId('city-launch-view').should('be.visible');
    cy.byTestId('city-launch-headline').should('have.text', `${waitlisted.location_name}, are you in?`);
    cy.byTestId('home-screen').should('not.exist');
    cy.byTestId('super-cat-tabs').should('not.exist');

    cy.byTestId('header-location').click();
    pickCity(launched);
    applyPickedCity();
    cy.byTestId('home-screen').should('be.visible');
    cy.byTestId('city-launch-view').should('not.exist');
  });

  it('CL-03 the page shows the live count and the goal, then the Host, Venue partner and Club Admin screens', () => {
    launchStatus(waitlisted.id).then((status) => {
      openLaunchPage(waitlisted.location_id);
      cy.byTestId('city-launch-headline').should('have.text', `${waitlisted.location_name}, are you in?`);
      cy.byTestId('city-launch-count').should('have.text', formatCount(status.subscriber_count));
      cy.byTestId('city-launch-count-city').should('have.text', waitlisted.location_name);
      cy.byTestId('city-launch-goal').should(
        'have.text',
        `We'll launch once ${formatCount(status.launch_target)} people have added their names.`,
      );
      cy.byTestId('city-launch-notify').should('contain.text', 'Join the waitlist!');
    });
    LAUNCH_ROLE_SECTIONS.forEach((role) => {
      cy.byTestId(`${role.testId}-title`).should('have.text', ROLE_TITLES[role.testId]);
      cy.byTestId(`${role.testId}-badge`).should('exist');
      cy.byTestId(`${role.testId}-cta`).should('contain.text', 'Tell me more');
    });
  });

  it('CL-04 each Tell me more opens that role’s Earn journey', () => {
    LAUNCH_ROLE_SECTIONS.forEach((role) => {
      const journey = EARN_JOURNEYS.find((candidate) => candidate.kind === role.kind);
      if (!journey) throw new Error(`No Earn journey is defined for ${role.kind}.`);
      openLaunchPage(waitlisted.location_id);
      cy.byTestId(`${role.testId}-cta`).click();
      cy.location('pathname').should('eq', journey.surveyPath);
    });
  });

  it('CL-05 Join the waitlist asks about location, adds the name, and a repeat adds nothing', () => {
    launchStatus(waitlisted.id).then((before) => {
      expect(before.is_subscribed, 'the run account starts off the waitlist').to.equal(false);
      const added = before.subscriber_count + 1;
      openLaunchPage(waitlisted.location_id);
      cy.byTestId('city-launch-notify').click();
      cy.byTestId('city-launch-share-location-title').should('have.text', 'Are you willing to share your current location?');
      cy.interceptOperation('SubscribeCityLaunch');
      cy.byTestId('city-launch-share-location-no').should('have.text', 'No').click();
      cy.wait('@SubscribeCityLaunch');
      cy.byTestId('city-launch-added')
        .should('contain.text', 'Your name has been added')
        .and('contain.text', `We'll notify you on WhatsApp when we launch in ${waitlisted.location_name}.`);
      cy.byTestId('city-launch-count').should('have.text', formatCount(added));

      openLaunchPage(waitlisted.location_id);
      cy.byTestId('city-launch-added').should('be.visible');
      cy.byTestId('city-launch-notify').should('not.exist');
      cy.byTestId('city-launch-count').should('have.text', formatCount(added));

      cy.gql<{ subscribeLocationLaunch: { subscriber_count: number; is_subscribed: boolean } }>(SUBSCRIBE, {
        id: waitlisted.id,
      }).then(({ subscribeLocationLaunch }) => {
        expect(subscribeLocationLaunch.is_subscribed).to.equal(true);
        expect(subscribeLocationLaunch.subscriber_count, 'a repeat subscribe adds no second row').to.equal(added);
      });
    });
  });

  it('CL-06 Send this to your friends copies the city’s link; the WhatsApp tile follows the city’s group link', () => {
    openLaunchPage(waitlisted.location_id);
    watchClipboard();
    cy.byTestId('city-launch-share-button').click();
    cy.location('origin').then((origin) => {
      cy.get('@copied').should('have.been.calledOnceWith', `${origin}/city-launch/${waitlisted.location_id}`);
    });
    notice().should('have.text', 'Link copied');
    if (waitlisted.whatsapp_group_url) {
      cy.window().then((win) => {
        cy.stub(win, 'open').as('opened');
      });
      cy.byTestId('city-launch-join-whatsapp')
        .should('contain.text', `Join ${waitlisted.location_name}'s WhatsApp for launch updates`);
      cy.byTestId('city-launch-join-whatsapp-button').click();
      cy.get('@opened').should('have.been.calledOnceWith', waitlisted.whatsapp_group_url, '_blank', 'noopener,noreferrer');
    } else {
      cy.byTestId('city-launch-join-whatsapp').should('not.exist');
    }
  });

  it('CL-07 a city that is already live refuses a subscribe', () => {
    cy.gqlRaw(SUBSCRIBE, { id: launched.id }).then((body) =>
      expectRefused(
        'subscribeLocationLaunch',
        body,
        refusal('BAD_USER_INPUT', `${launched.city || launched.location_name} is already live on Duncit.`),
      ),
    );
  });

  it('CL-08 signed out, the page asks to sign in and comes back to the same city afterwards', () => {
    cy.clearAuth();
    openLaunchPage(waitlisted.location_id);
    cy.byTestId('city-launch-count').should('be.visible');
    cy.byTestId('city-launch-goal').should('be.visible');
    cy.byTestId('city-launch-notify').should('not.exist');
    cy.byTestId('city-launch-sign-in').should('contain.text', 'Sign in to get notified').click();
    cy.location('pathname').should('eq', '/login');
    cy.location('search').should('eq', `?redirect=${encodeURIComponent(`/city-launch/${waitlisted.location_id}`)}`);
    signInOnLoginPage();
    cy.location('pathname').should('eq', `/city-launch/${waitlisted.location_id}`);
    // CL-05 put the run account on this waitlist.
    cy.byTestId('city-launch-added').should('be.visible');
  });
});
