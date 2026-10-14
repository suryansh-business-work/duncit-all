import {
  TABLE_VIEWPORT,
  cancelledFixturePod,
  partnerWorld2,
  signInRunPartner,
  tableRow,
  type PartnerWorld2,
} from '../../support/ui-partners-2';

/**
 * Partners › Attendance: the Club Admin's Pod Attendance page
 * (/club-admin/clubs/:clubId/pods/:id/attendance) — ClubAdminAttendanceSection
 * around the shared PodAttendanceView, reading podAttendanceBoard.
 *
 * The run's FREE pod is hosted by the run itself, in its own club, so the board
 * answers viewer HOST (attendance.service.ts resolveViewer: a host who is also
 * the club's admin is reported as HOST). It starts 14 days out and has no
 * completion deadline yet, so its lock is OPEN.
 *
 * Not here: every mark (force, OTP, companions, host manual) needs a started
 * pod with attendees holding tickets — a second account's booking — and an
 * EXPIRED or COMPLETED lock needs a pod that has already run.
 */

describe('Partners UI · Attendance (club admin who hosts the pod)', () => {
  let world: PartnerWorld2;
  let cancelled: { id: string; title: string };

  before(() => {
    signInRunPartner();
    partnerWorld2().then((found) => {
      world = found;
      cancelledFixturePod(found.clubId).then((pod) => {
        cancelled = pod;
      });
    });
  });

  beforeEach(() => {
    signInRunPartner();
  });

  it('AT-01 the attendance icon on an active pod opens its attendance page, and Club pods goes back', () => {
    const clubPath = `/club-admin/clubs/${world.clubId}`;
    cy.viewport(...TABLE_VIEWPORT);
    cy.interceptOperation('ClubAdminPodsTable');
    cy.visitApp(clubPath);
    cy.wait('@ClubAdminPodsTable');
    tableRow('partners-app-club-admin-pods', world.freePod.id, [world.freePod.title, 'Active']);
    tableRow('partners-app-club-admin-pods', cancelled.id, [cancelled.title, 'Cancelled']);
    cy.byTestId(`club-pod-view-${cancelled.id}`).should('be.visible');
    cy.byTestId(`club-pod-attendance-${cancelled.id}`).should('not.exist');
    cy.interceptOperation('PodAttendanceBoard');
    cy.byTestId(`club-pod-attendance-${world.freePod.id}`).click();
    cy.location('pathname').should('eq', `${clubPath}/pods/${world.freePod.id}/attendance`);
    cy.wait('@PodAttendanceBoard');
    cy.byTestId('pod-attendance-view').should('be.visible');
    cy.byTestId('back-button').should('contain.text', 'Club pods').click();
    cy.location('pathname').should('eq', clubPath);
  });

  it('AT-02 the club admin who hosts the pod gets the host’s board: scanner and Club Admin card, no direct mark', () => {
    cy.interceptOperation('PodAttendanceBoard');
    cy.visitApp(`/club-admin/clubs/${world.clubId}/pods/${world.freePod.id}/attendance`);
    cy.wait('@PodAttendanceBoard').then(({ response }) => {
      const board = response?.body.data.podAttendanceBoard;
      expect(board.pod_id, 'the board’s pod').to.equal(world.freePod.id);
      expect(board.viewer, 'a host who also administers the club').to.equal('HOST');
      expect(board.lock, 'an upcoming pod').to.equal('OPEN');
      expect(board.can_mark, 'the host may mark an open roster').to.equal(true);
      expect(board.pod_type, 'the fixture pod').to.equal('FREE');
    });
    cy.byTestId('pod-attendance-view').should('be.visible');
    cy.byTestId('attendance-earnings-note').should('contain.text', 'Mark who came');
    cy.byTestId('attendance-locked-note').should('not.exist');
    cy.byTestId('attendance-scan-cta').should('contain.text', 'Scan Attendee Event Tickets');
    cy.byTestId('attendance-club-admin-card').should('contain.text', 'Need help? Contact your Club Admin');
    cy.byTestId('attendance-direct-cta').should('not.exist');
  });

  // resolveViewer reads soft-deleted pods too, so a cancelled pod's board answers lock CANCELLED.
  it('AT-03 a cancelled pod’s board says This pod was cancelled, with no Mark Attendance', () => {
    cy.interceptOperation('PodAttendanceBoard');
    cy.visitApp(`/club-admin/clubs/${world.clubId}/pods/${cancelled.id}/attendance`);
    cy.wait('@PodAttendanceBoard').its('response.body.data.podAttendanceBoard.lock').should('eq', 'CANCELLED');
    cy.byTestId('attendance-locked-note')
      .should('contain.text', 'This pod was cancelled')
      .and('contain.text', 'A cancelled pod has no attendance to record.');
    cy.byTestId('attendance-direct-cta').should('not.exist');
    cy.byTestId('attendance-scan-cta').should('not.exist');
  });
});
