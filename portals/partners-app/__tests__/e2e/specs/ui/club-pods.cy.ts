import type { Interception } from 'cypress/types/net-stubbing';
import {
  TABLE_VIEWPORT,
  cancelledFixturePod,
  countOperation,
  expectNotSent,
  foreignPodId,
  marked,
  ownSparePod,
  partnerWorld2,
  pickOption,
  publicFlag,
  releaseSpareSlot,
  signInRunPartner,
  tableRow,
  type PartnerWorld2,
  type RunPod,
} from '../../support/ui-partners-2';

/**
 * Partners › Club pods: the club's pods table (/club-admin/clubs/:clubId,
 * clubAdminPodsTable — pinned to the club server-side, every stage including
 * cancelled), its row icons (ClubPodRowActions), the AI Monitoring trail, the
 * pod editor route and the pod details route, as the admin of the run's club.
 *
 * In the club: the run's FREE pod (Active) and the pod the fixture step's
 * host-pods spec cancelled (Cancelled). The one delete that goes through lands
 * on a spare pod this spec makes on its own ₹0 slot (deleted in `after()`).
 * A pod of another club is any live pod the public list shows that the run
 * neither hosts nor administers; every club-scoped read of it is refused by
 * clubAdminService.assertClubAdminForPod ("You do not administer this club").
 *
 * The rows that CREATE or EDIT a pod (create physical/virtual, assign a host,
 * save a draft, edit, the content guard, spots below seats) are not here: each
 * write runs the OpenAI content check, which this suite does not stub.
 */

const TABLE = 'partners-app-club-admin-pods';
const SPARE = { title: marked('ui club pod to delete'), note: marked('ui club delete pod slot'), days: 24 };
const NOT_YOURS = 'You do not administer this club';

describe('Partners UI · Club pods (the run’s own club)', () => {
  let world: PartnerWorld2;
  let cancelled: { id: string; title: string };
  let spare: RunPod;
  let foreignPod = '';
  let autoPodsOn = false;

  const clubPath = () => `/club-admin/clubs/${world.clubId}`;

  function openClubPods(): Cypress.Chainable<Interception> {
    cy.viewport(...TABLE_VIEWPORT);
    cy.interceptOperation('ClubAdminPodsTable');
    cy.visitApp(clubPath());
    return cy.wait('@ClubAdminPodsTable');
  }

  before(() => {
    signInRunPartner();
    partnerWorld2().then((found) => {
      world = found;
      cancelledFixturePod(found.clubId).then((pod) => {
        cancelled = pod;
      });
      foreignPodId(found).then((id) => {
        foreignPod = id;
      });
      ownSparePod(found, SPARE).then((pod) => {
        spare = pod;
      });
    });
    publicFlag('auto_pods').then((on) => {
      autoPodsOn = on;
    });
  });

  beforeEach(() => {
    signInRunPartner();
  });

  after(() => {
    signInRunPartner();
    cy.then(() => {
      if (world) releaseSpareSlot(world.venueId, SPARE.note);
    });
  });

  it('CP-01 the club’s table is pinned to the club and lists every stage: the free pod Active, the cancelled one Cancelled', () => {
    openClubPods().then(({ request, response }) => {
      expect(request.body.variables.club_id, 'the club asked for').to.equal(world.clubId);
      const rows: Array<{ club_id: string }> = response?.body.data.clubAdminPodsTable.rows ?? [];
      rows.forEach((row) => expect(row.club_id, 'every row is the club’s').to.equal(world.clubId));
    });
    cy.byTestId('club-pods-heading').should('have.text', world.clubName);
    tableRow(TABLE, world.freePod.id, [world.freePod.title, 'Active']);
    tableRow(TABLE, cancelled.id, [cancelled.title, 'Cancelled']);
  });

  it('CP-02 the Status filter is a query argument: Cancelled narrows the table, All statuses brings every stage back', () => {
    openClubPods();
    pickOption('club-pods-status-filter', 'club-pods-status-option-CANCELLED');
    cy.wait('@ClubAdminPodsTable').its('request.body.variables.status').should('eq', 'CANCELLED');
    tableRow(TABLE, cancelled.id, [cancelled.title, 'Cancelled']);
    cy.byTestId(`${TABLE}-row-${world.freePod.id}`).should('not.exist');
    pickOption('club-pods-status-filter', 'club-pods-status-option-ALL');
    cy.wait('@ClubAdminPodsTable').its('request.body.variables.status').should('eq', null);
    tableRow(TABLE, world.freePod.id, [world.freePod.title, 'Active']);
    tableRow(TABLE, cancelled.id, [cancelled.title]);
  });

  it('CP-03 row icons follow the stage: an active pod has all five, a cancelled one only view and edit', () => {
    openClubPods();
    const free = world.freePod.id;
    ['view', 'attendance', 'edit', 'request-change', 'delete'].forEach((icon) => {
      cy.byTestId(`club-pod-${icon}-${free}`).should('be.visible');
    });
    cy.byTestId(`club-pod-view-${cancelled.id}`).should('be.visible');
    cy.byTestId(`club-pod-edit-${cancelled.id}`).should('be.visible');
    ['attendance', 'request-change', 'delete'].forEach((icon) => {
      cy.byTestId(`club-pod-${icon}-${cancelled.id}`).should('not.exist');
    });
    cy.byTestId(`club-pod-view-${free}`).click();
    cy.location('pathname').should('eq', `${clubPath()}/pods/${free}`);
  });

  it('CP-04 Delete pod asks first, then soft-deletes the pod, which stays listed as Cancelled', () => {
    openClubPods();
    cy.byTestId(`club-pod-delete-${spare.id}`).click();
    cy.byTestId('confirm-dialog-title').should('have.text', 'Delete pod?');
    cy.byTestId('confirm-dialog-message').should(
      'contain.text',
      `This will remove ${spare.title} from the club. Members lose access to it. This cannot be undone.`,
    );
    cy.interceptOperation('ClubAdminDeletePod');
    cy.byTestId('confirm-dialog-confirm').should('have.text', 'Delete').click();
    cy.wait('@ClubAdminDeletePod').its('response.body.data.clubAdminDeletePod').should('eq', true);
    cy.byTestId('confirm-dialog').should('not.exist');
    tableRow(TABLE, spare.id, [spare.title, 'Cancelled']);
    cy.byTestId(`club-pod-delete-${spare.id}`).should('not.exist');
  });

  it('CP-05 the AI Monitoring pill opens the pod’s activity trail, which starts with its creation', () => {
    const pod = world.freePod;
    openClubPods();
    cy.interceptOperation('ClubAdminPodAuditLogs');
    cy.byTestId(`club-pod-ai-monitor-${pod.id}`).should('contain.text', 'AI Monitoring').click();
    cy.wait('@ClubAdminPodAuditLogs').then(({ response }) => {
      const actions: string[] = (response?.body.data.clubAdminPodAuditLogs ?? []).map((log: { action: string }) => log.action);
      expect(actions, 'the pod’s trail').to.include('CREATE');
    });
    cy.byTestId('pod-activity-title').should('have.text', `Activity · ${pod.title}`);
    cy.byTestId('pod-activity-dialog').should('contain.text', 'Created');
    cy.byTestId('pod-activity-close').click();
    cy.byTestId('pod-activity-dialog').should('not.exist');
  });

  it('CP-06 Request Change Club Admin asks why before anything is filed; Not now files nothing', () => {
    const file = countOperation('RequestPodChange');
    openClubPods();
    cy.byTestId(`club-pod-request-change-${world.freePod.id}`).click();
    cy.byTestId('request-change-sheet')
      .should('be.visible')
      .and('contain.text', 'Duncit will look for a different admin for this pod’s club.');
    cy.byTestId('request-change-confirm').click();
    cy.byTestId('request-change-reason').should('contain.text', 'Please tell us why you need this change');
    expectNotSent(file, 'RequestPodChange');
    cy.byTestId('request-change-cancel').click();
    cy.byTestId('request-change-sheet').should('not.exist');
  });

  it('CP-07 another club’s pod: its attendance board answers You do not administer this club, with Try again', () => {
    cy.interceptOperation('PodAttendanceBoard');
    cy.visitApp(`${clubPath()}/pods/${foreignPod}/attendance`);
    cy.wait('@PodAttendanceBoard').its('response.body.errors.0.message').should('eq', NOT_YOURS);
    cy.byTestId('attendance-view-error').should('contain.text', NOT_YOURS);
    cy.byTestId('attendance-retry').should('have.text', 'Try again');
    cy.byTestId('pod-attendance-view').should('not.exist');
  });

  it('CP-08 with auto_pods off, New Pod opens the editor straight away with the host note', function () {
    if (autoPodsOn) this.skip();
    openClubPods();
    cy.byTestId('club-pods-new-pod').should('have.text', 'New Pod').click();
    cy.location('pathname').should('eq', `${clubPath()}/pods/new`);
    cy.byTestId('club-pod-editor-host-note').should(
      'have.text',
      'You are added as the pod host automatically unless you assign hosts below.',
    );
  });

  it('CP-09 with auto_pods on, New Pod asks which kind; Auto Pod opens the club’s Auto Pod route, Normal the editor', function () {
    if (!autoPodsOn) this.skip();
    openClubPods();
    cy.byTestId('club-pods-new-pod').click();
    cy.byTestId('pod-kind-chooser').should('contain.text', 'What kind of pod?');
    cy.byTestId('pod-kind-auto').click();
    cy.location('pathname').should('eq', `${clubPath()}/auto-pods/new`);
    openClubPods();
    cy.byTestId('club-pods-new-pod').click();
    cy.byTestId('pod-kind-normal').click();
    cy.location('pathname').should('eq', `${clubPath()}/pods/new`);
    cy.byTestId('club-pod-editor-host-note').should('be.visible');
  });

  it('CP-10 the pod editor refuses a blank pod before anything is sent', () => {
    const create = countOperation('ClubAdminCreatePod');
    cy.interceptOperation('ClubAdminPodLookups');
    cy.visitApp(`${clubPath()}/pods/new`);
    cy.wait('@ClubAdminPodLookups');
    cy.byTestId('pod-form').should('be.visible');
    cy.byTestId('pod-form-save').click();
    cy.byTestId('pod-form').should('contain.text', 'At least one image is required');
    expectNotSent(create, 'ClubAdminCreatePod');
    cy.location('pathname').should('eq', `${clubPath()}/pods/new`);
  });

  it('CP-11 another club’s pod cannot be opened for editing: the editor shows the refusal and no form', () => {
    cy.interceptOperation('ClubAdminPodForEdit');
    cy.visitApp(`${clubPath()}/pods/${foreignPod}/edit`);
    cy.wait('@ClubAdminPodForEdit').its('response.body.errors.0.message').should('eq', NOT_YOURS);
    cy.byTestId('query-guard-error').should('have.text', NOT_YOURS);
    cy.byTestId('pod-form').should('not.exist');
  });

  it('CP-12 pod details show the pod with its Mark Attendance section; Edit opens the editor and Back the club’s pods', () => {
    const pod = world.freePod;
    cy.interceptOperation('AdminPodDetail');
    cy.visitApp(`${clubPath()}/pods/${pod.id}`);
    cy.wait('@AdminPodDetail');
    cy.byTestId('pod-details-title').should('have.text', pod.title);
    cy.byTestId('pod-attendance-view').should('be.visible');
    cy.byTestId('pod-details-edit').click();
    cy.location('pathname').should('eq', `${clubPath()}/pods/${pod.id}/edit`);
    cy.visitApp(`${clubPath()}/pods/${pod.id}`);
    cy.byTestId('pod-details-title').should('have.text', pod.title);
    cy.byTestId('back-button').first().should('contain.text', 'Club pods').click();
    cy.location('pathname').should('eq', clubPath());
  });

  it('CP-13 another club’s pod details: every club-scoped section is refused', () => {
    cy.interceptOperation('ClubAdminPodAttendeesDetail');
    cy.visitApp(`${clubPath()}/pods/${foreignPod}`);
    cy.wait('@ClubAdminPodAttendeesDetail').its('response.body.errors.0.message').should('eq', NOT_YOURS);
    cy.byTestId('attendance-view-error').should('contain.text', NOT_YOURS);
    cy.byTestId('pod-attendance-view').should('not.exist');
  });
});
