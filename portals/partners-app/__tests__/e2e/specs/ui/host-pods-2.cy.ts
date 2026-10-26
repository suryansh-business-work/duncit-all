import { podFeedbackPath, podMediaPath } from '@duncit/utils';
import {
  TABLE_VIEWPORT,
  countOperation,
  expectNotSent,
  marked,
  ownSparePod,
  partnerWorld2,
  pickOption,
  releaseSpareSlot,
  signInRunPartner,
  tableRow,
  type PartnerWorld2,
  type RunPod,
} from '../../support/ui-partners-2';

/**
 * Partners › Host pods — Host > Your Pods (/host/pods): the myHostPodsTable
 * and each row's HostPodActionsMenu (@duncit/host-pod-actions), as the approved
 * host the fixture step made, on the run's FREE pod at its own venue (14 days
 * ahead, so it is upcoming: its plan can change, its door is not open yet).
 *
 * The free pod is only read and its dialogs opened and closed: every refused
 * form is proven to send nothing. The one cancel that goes through lands on a
 * spare pod this spec makes on its own ₹0 slot; the slot is deleted in
 * `after()` and the pod goes with the account (e2eRun.purge.ts).
 *
 * Copy is the shipped English (packages/i18n shell.hostPodActions,
 * shell.podFeedback, shell.podMedia, changeRequest).
 */

const TABLE = 'partners-app-host-pods';
const SPARE = { title: marked('ui pod to cancel'), note: marked('ui cancel pod slot'), days: 23 };

function openYourPods(pod: RunPod): void {
  cy.viewport(...TABLE_VIEWPORT);
  cy.interceptOperation('PartnerMyHostPodsTable');
  cy.visitApp('/host/pods');
  cy.wait('@PartnerMyHostPodsTable');
  tableRow(TABLE, pod.id, [pod.title]);
}

function openMenu(pod: RunPod): void {
  cy.byTestId(`host-pod-actions-${pod.id}`).should('be.enabled').click();
  cy.byTestId(`host-pod-actions-menu-${pod.id}`).should('be.visible');
}

/** Replace the clipboard (and, when asked, the share sheet) so a copy is recorded instead of performed. */
function stubClipboard(withoutShareSheet = false): void {
  cy.window().then((win) => {
    cy.stub(win.navigator.clipboard, 'writeText').as('clipboard').resolves();
    if (withoutShareSheet) Object.defineProperty(win.navigator, 'share', { value: undefined, configurable: true });
  });
}

const enabled = (testId: string) => cy.byTestId(testId).should('be.visible').and('not.have.class', 'Mui-disabled');

describe('Partners UI · Host pods (run host, its own FREE pod)', () => {
  let world: PartnerWorld2;
  let spare: RunPod;

  before(() => {
    signInRunPartner();
    partnerWorld2().then((found) => {
      world = found;
      ownSparePod(found, SPARE).then((pod) => {
        spare = pod;
      });
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

  it('HP2-01 an upcoming pod offers Edit, both links, Request Change Host and Cancel; scanning waits for the door; no Complete', () => {
    const pod = world.freePod;
    openYourPods(pod);
    openMenu(pod);
    cy.byTestId(`host-pod-action-scan-${pod.id}`)
      .should('have.class', 'Mui-disabled')
      .and('contain.text', 'Scan attendee event tickets')
      .and('contain.text', 'Scanning opens');
    enabled(`host-pod-action-edit-${pod.id}`).and('contain.text', 'Edit pod');
    enabled(`host-pod-action-media-link-${pod.id}`).and('contain.text', 'Upload Pod Media');
    enabled(`host-pod-action-feedback-link-${pod.id}`).and('contain.text', 'Feedback link');
    enabled(`host-pod-action-request-change-${pod.id}`).and('contain.text', 'Request Change Host');
    enabled(`host-pod-action-cancel-${pod.id}`).and('contain.text', 'Cancel pod');
    cy.byTestId(`host-pod-action-complete-${pod.id}`).should('not.exist');
  });

  it('HP2-02 Edit pod refuses a short title, a short description and no image, and sends nothing', () => {
    const pod = world.freePod;
    const update = countOperation('HostUpdatePod');
    const moderate = countOperation('HostEditModeratePodContent');
    openYourPods(pod);
    openMenu(pod);
    cy.byTestId(`host-pod-action-edit-${pod.id}`).click();
    cy.byTestId('pod-edit-dialog').should('be.visible');
    cy.byTestId('pod-edit-title').find('input').should('have.value', pod.title).clear().type('ab');
    cy.byTestId('pod-edit-description').find('textarea:not([aria-hidden])').clear().type('short');
    cy.byTestId('pod-edit-dialog').find('[data-testid="media-list-remove"]').first().click();
    cy.byTestId('pod-edit-dialog').find('[data-testid="media-list-remove"]').should('not.exist');
    cy.byTestId('pod-edit-save').click();
    cy.byTestId('pod-edit-title').should('contain.text', 'Title is too short');
    cy.byTestId('pod-edit-description').should('contain.text', 'Add a longer description');
    cy.byTestId('pod-edit-dialog').should('contain.text', 'Add at least one image URL');
    expectNotSent(moderate, 'HostEditModeratePodContent');
    expectNotSent(update, 'HostUpdatePod');
    cy.byTestId('pod-edit-cancel').click();
    cy.byTestId('pod-edit-dialog').should('not.exist');
  });

  it('HP2-03 a host can only raise a live pod’s spots: the stepper starts at the server’s floor and cannot go below it', () => {
    const pod = world.freePod;
    openYourPods(pod);
    openMenu(pod);
    cy.interceptOperation('HostPodSpotLimits');
    cy.byTestId(`host-pod-action-edit-${pod.id}`).click();
    cy.wait('@HostPodSpotLimits').then(({ response }) => {
      const limits = response?.body.data.podSpotLimits;
      expect(limits.can_decrease, 'a host may not lower a live pod').to.equal(false);
      expect(limits.min, 'the floor is the current capacity').to.equal(limits.current);
      cy.byTestId('field-no_of_spots_text').should('have.value', String(limits.current));
      cy.byTestId('spots-dec').should('be.disabled');
      cy.byTestId('spots-inc').should(limits.max > limits.current ? 'be.enabled' : 'be.disabled');
    });
    cy.byTestId('pod-spots-field-increase-only-hint').should(
      'have.text',
      'A live pod’s spots can only be increased — ask your Club Admin to reduce them.',
    );
    cy.byTestId('pod-edit-cancel').click();
  });

  it('HP2-04 Cancel pod needs a reason, and a note for Other; Keep pod leaves the pod live', () => {
    const pod = world.freePod;
    const cancel = countOperation('HostDeletePod');
    openYourPods(pod);
    openMenu(pod);
    cy.interceptOperation('HostPodDeleteImpact');
    cy.byTestId(`host-pod-action-cancel-${pod.id}`).click();
    cy.wait('@HostPodDeleteImpact');
    cy.byTestId('pod-delete-dialog')
      .should('be.visible')
      .and('contain.text', `You are cancelling ${pod.title}. This cannot be undone.`);
    cy.byTestId('pod-delete-impact').should(
      'have.text',
      'No one else has joined this pod — it will be cancelled immediately.',
    );
    cy.byTestId('pod-delete-note').should('contain.text', 'Shared with attendees in the cancellation email.');
    cy.byTestId('pod-delete-confirm').should('contain.text', 'Cancel pod').click();
    cy.byTestId('pod-cancel-reason').should('contain.text', 'Select a reason');
    pickOption('pod-cancel-reason', 'pod-delete-reason-Other');
    cy.byTestId('pod-delete-confirm').click();
    cy.byTestId('pod-delete-note').should('contain.text', 'Please describe the reason');
    expectNotSent(cancel, 'HostDeletePod');
    cy.byTestId('pod-delete-cancel').should('contain.text', 'Keep pod').click();
    cy.byTestId('pod-delete-dialog').should('not.exist');
    tableRow(TABLE, pod.id, [pod.title, 'Active']);
  });

  it('HP2-05 cancelling a pod nobody else joined takes it off Your Pods', () => {
    openYourPods(spare);
    openMenu(spare);
    cy.byTestId(`host-pod-action-cancel-${spare.id}`).click();
    cy.byTestId('pod-delete-impact').should('contain.text', 'No one else has joined this pod');
    pickOption('pod-cancel-reason', 'pod-delete-reason-Event cancelled');
    cy.interceptOperation('HostDeletePod');
    cy.byTestId('pod-delete-confirm').click();
    cy.wait('@HostDeletePod').its('response.body.data.hostDeletePod').should('eq', true);
    cy.byTestId('pod-delete-dialog').should('not.exist');
    // The second answer to the table's query: the refetch the cancel triggers.
    cy.wait('@PartnerMyHostPodsTable');
    cy.byTestId(`${TABLE}-row-${spare.id}`).should('not.exist');
    tableRow(TABLE, world.freePod.id, [world.freePod.title]);
  });

  it('HP2-06 Share feedback link with no share sheet copies the ask and the mWeb rating link', () => {
    const pod = world.freePod;
    openYourPods(pod);
    stubClipboard(true);
    openMenu(pod);
    cy.byTestId(`host-pod-action-share-feedback-${pod.id}`).click();
    cy.get('@clipboard').should('have.been.calledOnce');
    cy.get('@clipboard')
      .its('firstCall.args.0')
      .should((text: string) => {
        const [ask, link] = text.split('\n');
        expect(ask, 'the ask').to.equal(`How was “${pod.title}”? Tell us in a minute:`);
        expect(link, 'the rating link').to.match(/^https?:\/\//).and.satisfy((url: string) => url.endsWith(podFeedbackPath(pod.id)));
      });
    cy.byTestId('host-pod-actions-toast').should('contain.text', 'Feedback link copied');
  });

  it('HP2-07 Copy feedback link copies the bare rating link', () => {
    const pod = world.freePod;
    openYourPods(pod);
    stubClipboard();
    openMenu(pod);
    cy.byTestId(`host-pod-action-copy-feedback-${pod.id}`).click();
    cy.get('@clipboard')
      .its('firstCall.args.0')
      .should((text: string) => {
        expect(text, 'a single link').to.match(/^https?:\/\/\S+$/);
        expect(text.endsWith(podFeedbackPath(pod.id)), 'the pod’s rating path').to.equal(true);
      });
    cy.byTestId('host-pod-actions-toast').should('contain.text', 'Feedback link copied');
  });

  it('HP2-08 Copy on the Upload Pod Media row copies the pod’s media link and says Upload link copied', () => {
    const pod = world.freePod;
    openYourPods(pod);
    stubClipboard();
    openMenu(pod);
    cy.byTestId(`host-pod-action-copy-media-${pod.id}`).click();
    cy.get('@clipboard')
      .its('firstCall.args.0')
      .should((text: string) => {
        expect(text, 'a single link').to.match(/^https?:\/\/\S+$/);
        expect(text.endsWith(podMediaPath(pod.id)), 'the pod’s media path').to.equal(true);
      });
    cy.byTestId('host-pod-actions-toast').should('contain.text', 'Upload link copied');
  });

  it('HP2-09 Request Change Host asks why before anything is filed; Not now files nothing', () => {
    const pod = world.freePod;
    const file = countOperation('RequestPodChange');
    openYourPods(pod);
    openMenu(pod);
    cy.byTestId(`host-pod-action-request-change-${pod.id}`).click();
    cy.byTestId('request-change-sheet')
      .should('be.visible')
      .and('contain.text', 'Ask Duncit for a change?')
      .and('contain.text', 'Duncit will look for a different host for this pod.');
    cy.byTestId('request-change-penalty').should('be.visible');
    cy.byTestId('request-change-confirm').should('contain.text', 'Yes, request a change').click();
    cy.byTestId('request-change-reason').should('contain.text', 'Please tell us why you need this change');
    expectNotSent(file, 'RequestPodChange');
    cy.byTestId('request-change-cancel').should('contain.text', 'Not now').click();
    cy.byTestId('request-change-sheet').should('not.exist');
  });

  it('HP2-10 New Pod refuses a blank pod before anything is sent', () => {
    const create = countOperation('CreatePartnerPod');
    cy.interceptOperation('PartnerPodLookups');
    cy.visitApp('/host/pods');
    cy.wait('@PartnerPodLookups');
    cy.byTestId('host-pods-new').should('be.enabled').click();
    cy.byTestId('pod-form').should('be.visible');
    cy.byTestId('pod-form-save').click();
    cy.byTestId('pod-form').should('contain.text', 'At least one image is required');
    expectNotSent(create, 'CreatePartnerPod');
  });
});
