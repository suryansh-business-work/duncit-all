import { adminRun, openRunUser, releaseAdmin, signInAdmin, type AdminRun } from '../../support/ui-admin-1';

/**
 * Admin › User App Activity: the Activity tab of a member's details page — a
 * year heatmap of app visits (UserActivitySection over `userActivityYear`) and
 * the day's journey (ActivityJourneyDialog over `userClickstream`). Both are
 * SUPER_ADMIN / CITY_ADMIN reads (analytics.resolver.ts).
 *
 * Read for the run account. The Delete Day / Delete Year actions are not
 * pressed: the run's clickstream is evidence other staff specs read.
 */

interface ActivityYear {
  year: number;
  available_years: number[];
  total_visits: number;
  days: { date: string; count: number }[];
}

const ACTIVITY = `query E2eAdminUserActivity($user_id: ID!, $year: Int) {
  userActivityYear(user_id: $user_id, year: $year) { year available_years total_visits days { date count } }
}`;

const CLICKSTREAM = `query E2eAdminUserClickstream($user_id: ID!, $date: String!) {
  userClickstream(user_id: $user_id, date: $date, limit: 500) { id }
}`;

/** Every date of `year` (UTC, yyyy-MM-dd) up to today — the calendar's blocks. */
function datesOf(year: number): string[] {
  const out: string[] = [];
  const day = new Date(Date.UTC(year, 0, 1));
  const today = new Date().toISOString().slice(0, 10);
  while (day.getUTCFullYear() === year) {
    const iso = day.toISOString().slice(0, 10);
    if (iso > today) break;
    out.push(iso);
    day.setUTCDate(day.getUTCDate() + 1);
  }
  return out;
}

describe('Admin · User App Activity (City Admin)', () => {
  let run: AdminRun;
  const year = new Date().getFullYear();

  before(() => {
    adminRun(['CITY_ADMIN']).then((r) => {
      run = r;
    });
  });

  beforeEach(() => {
    signInAdmin(run);
  });

  after(() => releaseAdmin(run));

  it('UAA-01 the tab opens on this year and counts exactly the visits the server recorded', () => {
    cy.interceptOperation('UserActivityYear');
    openRunUser(run, 'activity');
    cy.wait('@UserActivityYear').its('request.body.variables.year').should('eq', year);
    cy.gql<{ userActivityYear: ActivityYear }>(ACTIVITY, { user_id: run.profile.user_id, year }).then(({ userActivityYear }) => {
      cy.byTestId('admin-user-activity-visits').should('have.text', `${userActivityYear.total_visits} visits recorded in ${year}.`);
      for (const day of userActivityYear.days.filter((d) => d.count > 0)) {
        cy.byTestId(`admin-user-activity-day-${day.date}`).should('exist');
      }
    });
  });

  it('UAA-02 a day with no events opens its journey reading "No clickstream events recorded for this day."', () => {
    cy.gql<{ userActivityYear: ActivityYear }>(ACTIVITY, { user_id: run.profile.user_id, year }).then(({ userActivityYear }) => {
      const counted = new Set(userActivityYear.days.filter((d) => d.count > 0).map((d) => d.date));
      const quiet = datesOf(year).find((d) => !counted.has(d));
      expect(quiet, `a day of ${year} with no recorded visit`).to.be.a('string');
      cy.gql<{ userClickstream: { id: string }[] }>(CLICKSTREAM, { user_id: run.profile.user_id, date: quiet })
        .its('userClickstream')
        .should('have.length', 0);

      openRunUser(run, 'activity');
      cy.interceptOperation('UserClickstream');
      cy.byTestId(`admin-user-activity-day-${quiet}`).scrollIntoView().click({ force: true });
      cy.wait('@UserClickstream').its('request.body.variables.date').should('eq', quiet);
      cy.byTestId('admin-user-journey-title').should('have.text', `User Journey · ${quiet}`);
      cy.byTestId('admin-user-journey-empty').should('have.text', 'No clickstream events recorded for this day.');
    });
  });
});
