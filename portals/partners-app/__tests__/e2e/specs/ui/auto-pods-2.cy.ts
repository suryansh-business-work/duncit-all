import { partnerWorld2, publicFlag, signInRunPartner, type PartnerWorld2 } from '../../support/ui-partners-2';

/**
 * Partners › Auto Pods, for the host and the club admin the fixture step made.
 *
 * Neither can be offered anything: the run's host profile was approved in no
 * sub-category, and autoPodService.listForHost only opens offers in the host's
 * sub-categories (hostOpenFilter returns no filter for none); the run's club
 * has no category, and clubOpenFilter skips a club without one. So both queues
 * are empty by construction — their own enrolments included, since the run
 * never claimed one. The queue pages are tabs that exist only while the
 * `auto_pods` flag is on (studio-hubs useAutoPodsTab); the club's New Auto Pod
 * route is not behind the flag and refuses a club with no category outright.
 *
 * Not here: claiming, assigning, pricing and withdrawing need an offer, which
 * staff open, and the races need a second host or club.
 */

describe('Partners UI · Auto Pods (run host and club admin)', () => {
  let world: PartnerWorld2;
  let autoPodsOn = false;

  before(() => {
    signInRunPartner();
    partnerWorld2().then((found) => {
      world = found;
    });
    publicFlag('auto_pods').then((on) => {
      autoPodsOn = on;
    });
  });

  beforeEach(() => {
    signInRunPartner();
  });

  it('AP2-01 the host queue is empty for a host with no approved category', function () {
    if (!autoPodsOn) this.skip();
    cy.interceptOperation('HostAutoPods');
    cy.visitApp('/host/auto-pods');
    cy.wait('@HostAutoPods').its('response.body.data.hostAutoPods').should('deep.equal', []);
    cy.byTestId('host-pods-hub').should('contain.text', 'Auto Pods to host');
    cy.byTestId('auto-pods-empty').should('have.text', 'No Auto Pods need a host right now.');
    cy.byTestId('auto-pods-queue').should('not.exist');
  });

  it('AP2-02 the host’s Category filter is disabled and says the host is approved in no category', function () {
    if (!autoPodsOn) this.skip();
    cy.interceptOperation('MyHostCategoriesForAutoPod');
    cy.visitApp('/host/auto-pods');
    cy.wait('@MyHostCategoriesForAutoPod').then(({ response }) => {
      const rows: Array<{ sub_category_id: string | null }> = response?.body.data.myHost?.host_categories ?? [];
      expect(rows.filter((row) => row.sub_category_id), 'the run host’s sub-categories').to.deep.equal([]);
    });
    cy.byTestId('auto-pod-category-filter')
      .should('contain.text', 'You are not an approved host in any category yet.')
      .find('[role="combobox"]')
      .should('have.attr', 'aria-disabled', 'true');
  });

  it('AP2-03 the club queue is empty for a club with no category', function () {
    if (!autoPodsOn) this.skip();
    cy.interceptOperation('ClubAdminAutoPods');
    cy.visitApp('/club-admin/auto-pods');
    cy.wait('@ClubAdminAutoPods').its('response.body.data.clubAdminAutoPods').should('deep.equal', []);
    cy.byTestId('clubs-hub').should('contain.text', 'Auto Pods for your club');
    cy.byTestId('auto-pods-empty').should('have.text', 'No Auto Pods need a club right now.');
  });

  it('AP2-04 a club without a category cannot open an Auto Pod: the form refuses to open and Back to pods returns', () => {
    expect(world.clubCategoryId, 'the fixture club has no category').to.equal(null);
    const clubPath = `/club-admin/clubs/${world.clubId}`;
    cy.interceptOperation('ClubAdminPodLookups');
    cy.visitApp(`${clubPath}/auto-pods/new`);
    cy.wait('@ClubAdminPodLookups');
    cy.byTestId('club-auto-pod-category-missing').should(
      'have.text',
      'This club has no category yet. Set one under Edit Club Details before opening an Auto Pod.',
    );
    cy.byTestId('auto-pod-stepper').should('not.exist');
    cy.byTestId('club-auto-pod-back').should('have.text', 'Back to pods').click();
    cy.location('pathname').should('eq', clubPath);
  });
});
