/// <reference types="cypress" />
import { podPhase } from '@duncit/utils';
import { signInRunMember } from '../../../support/access-steps';
import {
  loadWorld,
  openPodPage,
  pickerPlace,
  podWhere,
  savedCity,
  twoCities,
  useCity,
  type World,
  type WorldCity,
  type WorldPod,
} from '../../../support/ui-apps-1';

/**
 * Location, live on staging (first part of the module; other rows live in
 * location-*.cy.ts). The header's picker drills Country › State › City and
 * persists a real pick on the account (useHeaderLocation.ts); a pod or club
 * link into another city asks to switch (LocationMismatchDialog.tsx), and a
 * virtual pod never does. Two launched cities with live pods are read from
 * staging in `before`; the run account's saved city is set through the API
 * before each journey so every one starts from the same place.
 */

const header = () => cy.byTestId('header-location');
const dialog = () => cy.byTestId('location-mismatch-dialog');

function openHome(): void {
  cy.interceptOperation('HomeFeedLive');
  cy.visitApp('/');
  cy.wait('@HomeFeedLive');
}

/** Open the header picker and stage `city` as the draft: country chip, state chip, city card. */
function draftCity(city: WorldCity): void {
  const { country, state } = pickerPlace(city);
  header().click();
  cy.byTestId('location-dialog-title').should('have.text', 'Choose your location');
  cy.byTestId(`country-state-picker-country-${country}`).click();
  cy.byTestId(`country-state-picker-state-${state}`).click();
  cy.byTestId(`location-${city.id}-select`).click();
  cy.byTestId(`location-${city.id}-select`).should('have.attr', 'aria-pressed', 'true');
}

describe('UI Location (1)', () => {
  let world: World;
  let home: WorldCity;
  let away: WorldPod;
  let awayCity: WorldCity;

  before(() => {
    signInRunMember();
    loadWorld().then((found) => {
      world = found;
      ({ home, away } = twoCities(found));
      const city = found.cities.find((row) => row.id === away.location_id);
      if (!city) throw new Error('The away pod points at a city the location list does not have.');
      awayCity = city;
    });
  });

  it('LC-01 a city picked in the header picker is applied and saved on the account', () => {
    useCity(home.id);
    openHome();
    header().should('contain.text', home.location_name);
    draftCity(awayCity);
    cy.interceptOperation('SetMySelectedLocation');
    cy.byTestId('location-dialog-apply').click();
    cy.wait('@SetMySelectedLocation');
    header().should('contain.text', awayCity.location_name);
    savedCity().should('eq', awayCity.id);
  });

  it('LC-02 Cancel in the picker leaves the city and the saved choice as they were', () => {
    useCity(home.id);
    openHome();
    draftCity(awayCity);
    cy.byTestId('location-dialog-cancel').click();
    cy.byTestId('location-dialog-title').should('not.exist');
    header().should('contain.text', home.location_name).and('not.contain.text', awayCity.location_name);
    savedCity().should('eq', home.id);
  });

  it('LC-03 a pod link into another city offers Switch, which moves the header there and saves it', () => {
    useCity(home.id);
    openPodPage(away);
    dialog().should('be.visible');
    cy.byTestId('location-mismatch-title').should('have.text', 'This link is for a different location');
    dialog().should('contain.text', home.location_name).and('contain.text', awayCity.location_name);
    cy.interceptOperation('SetMySelectedLocation');
    cy.byTestId('location-mismatch-switch').should('have.text', `Switch to ${awayCity.location_name}`).click();
    cy.wait('@SetMySelectedLocation');
    dialog().should('not.exist');
    header().should('contain.text', awayCity.location_name);
    cy.byTestId('pod-info-title').should('have.text', away.pod_title);
    savedCity().should('eq', awayCity.id);
  });

  it('LC-04 Continue keeps the current city, and the club behind the link asks again with its own sentence', () => {
    useCity(home.id);
    openPodPage(away);
    cy.byTestId('location-mismatch-keep').should('have.text', `Continue in ${home.location_name}`).click();
    dialog().should('not.exist');
    cy.byTestId('pod-info-title').should('have.text', away.pod_title);
    header().should('contain.text', home.location_name);
    savedCity().should('eq', home.id);
    cy.visitApp(`/club/${away.club_slug}`);
    dialog()
      .should('be.visible')
      .and('contain.text', `The club you are opening is in ${awayCity.location_name}`)
      .and('contain.text', `your Duncit location is currently set to ${home.location_name}`);
  });

  it('LC-05 a virtual pod link never asks to switch city', () => {
    const virtual = podWhere(world, 'an upcoming VIRTUAL pod', (pod) =>
      pod.pod_mode === 'VIRTUAL' && podPhase(pod.pod_date_time, pod.pod_end_date_time) === 'UPCOMING',
    );
    useCity(home.id);
    openPodPage(virtual);
    cy.byTestId('pod-info-title').should('have.text', virtual.pod_title);
    cy.byTestId('pod-schedule-platform').should('be.visible');
    dialog().should('not.exist');
    header().should('contain.text', home.location_name);
  });
});
