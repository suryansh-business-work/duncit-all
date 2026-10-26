import { podRowStatus, podRowStatusLabel, type PodStatusFields } from '@duncit/utils';
import {
  copyOf,
  findPartnerWorld,
  gridRow,
  loadCopy,
  signInPartner,
  type PartnerWorld,
} from '../../support/partner-world-1';

/**
 * Partners · Your Pods (/host/pods) for the run's approved host: the table of
 * every pod it runs (myHostPodsTable), each row's status chip, and the New Pod
 * button that follows the host application.
 *
 * Nothing is created: a new pod needs a cover image upload. Not here either:
 * the "not approved yet" state (the run host is approved and the role cannot be
 * revoked), completed pods with attendance (need a scanned, settled pod).
 */

/** clubAdmin.podStatus.* — the words each chip reads, as packages/i18n ships them. */
const STATUS_SHIPPED: Record<string, string> = {
  'clubAdmin.podStatus.active': 'Active',
  'clubAdmin.podStatus.draft': 'Draft',
  'clubAdmin.podStatus.awaitingVenue': 'Awaiting venue',
  'clubAdmin.podStatus.venueRejected': 'Venue rejected',
  'clubAdmin.podStatus.completed': 'Completed',
  'clubAdmin.podStatus.cancelled': 'Cancelled',
};
const statusLabel = (row: PodStatusFields) =>
  podRowStatusLabel(podRowStatus(row), (key) => copyOf(key, STATUS_SHIPPED[key] ?? key));

type HostPodRow = PodStatusFields & { id: string; pod_title: string };

/** Open Your Pods and yield the first page of rows the page received. */
function openHostPods(): Cypress.Chainable<HostPodRow[]> {
  cy.interceptOperation('PartnerMyHostPodsTable');
  cy.visitApp('/host/pods');
  return cy
    .wait('@PartnerMyHostPodsTable')
    .then(({ response }) => (response?.body?.data?.myHostPodsTable?.rows ?? []) as HostPodRow[]);
}

describe('Partners UI · Host pods', () => {
  let world: PartnerWorld;

  before(() => {
    signInPartner();
    loadCopy();
    findPartnerWorld().then((found) => {
      world = found;
    });
  });

  beforeEach(() => {
    signInPartner();
  });

  it('HP-01 Your Pods lists the pods the host runs, the run’s free pod among them', () => {
    openHostPods().then((rows) => {
      expect(rows.map((row) => row.id), 'rows').to.include(world.pod.id);
      rows.forEach((row) => gridRow(row.id).should('contain.text', row.pod_title));
    });
    cy.byTestId('host-pods-hub').should('be.visible');
  });

  it('HP-02 every row’s status chip is the stage the server holds — the free pod reads Active', () => {
    openHostPods().then((rows) => {
      const free = rows.find((row) => row.id === world.pod.id);
      if (!free) throw new Error('The free pod is not on the first page of Your Pods.');
      expect(podRowStatus(free), 'the free pod’s stage').to.equal('ACTIVE');
      rows.forEach((row) => {
        gridRow(row.id).find('[col-id="is_active"]').should('contain.text', statusLabel(row));
      });
    });
  });

  it('HP-03 New Pod is enabled for the approved host, with no approval notice', () => {
    cy.interceptOperation('PartnerPodLookups');
    openHostPods();
    cy.wait('@PartnerPodLookups').its('response.body.data.myHost.status').should('eq', 'APPROVED');
    cy.byTestId('host-pods-new').should('be.enabled');
    cy.byTestId('host-pods-not-approved').should('not.exist');
  });
});
