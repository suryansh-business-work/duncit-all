/// <reference types="cypress" />
import { podPhase } from '@duncit/utils';
import { signInRunMember } from '../../../support/access-steps';
import {
  isStranger,
  loadWorld,
  openPodPage,
  podWhere,
  stubShareSheet,
  useCity,
  type World,
  type WorldPod,
} from '../../../support/ui-apps-1';

/**
 * Pod details (/club/:clubSlug/pod/:podSlug), live on staging, as a member who
 * neither hosts nor has joined the pods opened here. Each pod is read from
 * staging first; before a physical pod is opened the run account's header city
 * is set to that pod's own city, so the page opens without the switch-city
 * prompt (that prompt is the Location spec's).
 */

const phaseOf = (pod: WorldPod) => podPhase(pod.pod_date_time, pod.pod_end_date_time);
const launchedCity = (world: World, pod: WorldPod) =>
  world.cities.some((city) => city.id === pod.location_id && city.is_launched !== false);

describe('UI Pod details', () => {
  let world: World;
  let upcoming: WorldPod;

  before(() => {
    signInRunMember();
    loadWorld().then((found) => {
      world = found;
      upcoming = podWhere(found, 'a physical upcoming pod in a launched city that the run account has not joined', (pod) =>
        pod.pod_mode === 'PHYSICAL' && phaseOf(pod) === 'UPCOMING' && launchedCity(found, pod) && isStranger(found, pod),
      );
    });
  });

  it('PDT-01 a pod link resolves its slugs and renders the title, schedule, place, details and booking bar', () => {
    useCity(String(upcoming.location_id));
    cy.interceptOperation('PodIdBySlugs');
    openPodPage(upcoming);
    cy.wait('@PodIdBySlugs').its('response.body.data.podBySlugs.id').should('eq', upcoming.id);
    cy.byTestId('pod-info-title').should('have.text', upcoming.pod_title);
    cy.byTestId('pod-schedule-header-title').should('have.text', 'Time & Venue');
    cy.byTestId('pod-schedule-time').should('be.visible');
    cy.byTestId('pod-schedule-place').should('be.visible');
    cy.byTestId('pod-detail-accordions').should('exist');
    cy.byTestId('pod-action-panel').should('exist');
    cy.byTestId('pod-book').should('exist');
    cy.byTestId('pod-booking-closed').should('not.exist');
  });

  it('PDT-02 a slug that resolves to no pod shows Pod not found', () => {
    cy.interceptOperation('PodIdBySlugs');
    cy.visitApp('/club/e2e-no-such-club/pod/e2e-no-such-pod');
    cy.wait('@PodIdBySlugs').its('response.body.data.podBySlugs').should('be.null');
    cy.byTestId('pod-details-not-found').should('have.text', 'Pod not found.');
    cy.byTestId('pod-details-error').should('not.exist');
  });

  it('PDT-03 Share hands the share sheet a message with the pod’s title and a link', () => {
    useCity(String(upcoming.location_id));
    openPodPage(upcoming);
    stubShareSheet();
    cy.byTestId('pod-share').click();
    cy.get('@share').should('have.been.calledOnce');
    cy.get('@share').its('firstCall.args.0').should((payload: { title: string; text: string }) => {
      expect(payload.title, 'title').to.equal(upcoming.pod_title);
      expect(payload.text, 'message names the pod').to.contain(upcoming.pod_title);
      expect(payload.text, 'and carries a link').to.match(/https?:\/\/\S+/);
    });
    cy.byTestId('pod-details-error').should('not.exist');
  });

  it('PDT-04 a pod that has already taken place shows booking as closed to a non-member', () => {
    const past = podWhere(world, 'a physical past pod in a launched city that the run account did not join', (pod) =>
      pod.pod_mode === 'PHYSICAL' && phaseOf(pod) === 'PREVIOUS' && launchedCity(world, pod) && isStranger(world, pod),
    );
    useCity(String(past.location_id));
    openPodPage(past);
    cy.byTestId('pod-booking-closed').should('contain.text', 'This pod has already taken place — booking is closed.');
    cy.byTestId('pod-book').should('not.exist');
  });

  it('PDT-05 Contact support about this pod opens a booking ticket pre-filled with the pod', () => {
    useCity(String(upcoming.location_id));
    openPodPage(upcoming);
    cy.byTestId('pod-details-contact-support').should('have.text', 'Contact support about this pod').click();
    cy.location('pathname').should('eq', '/support/tickets');
    cy.location('search').then((search) => {
      const params = new URLSearchParams(search);
      expect(params.get('category'), 'category').to.equal('BOOKING');
      expect(params.get('podId'), 'pod id').to.equal(upcoming.id);
      expect(params.get('podTitle'), 'pod title').to.equal(upcoming.pod_title);
    });
    cy.byTestId('ticket-attached-pod').should('have.text', `About pod: ${upcoming.pod_title}`);
    cy.byTestId('field-subject').should('have.value', `Support - ${upcoming.pod_title}`);
  });

  it('PDT-06 a virtual pod hides its meeting details until joined and draws no venue', () => {
    const virtual = podWhere(world, 'an upcoming VIRTUAL pod the run account has not joined', (pod) =>
      pod.pod_mode === 'VIRTUAL' && phaseOf(pod) === 'UPCOMING' && isStranger(world, pod),
    );
    openPodPage(virtual);
    cy.byTestId('pod-info-title').should('have.text', virtual.pod_title);
    cy.byTestId('pod-schedule-platform').should('be.visible');
    cy.byTestId('pod-schedule').should('contain.text', 'Meeting link will be visible after joining this pod.');
    cy.byTestId('pod-schedule-place').should('not.exist');
  });
});
