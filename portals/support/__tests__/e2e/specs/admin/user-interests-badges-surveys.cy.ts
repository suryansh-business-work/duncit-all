import {
  adminRun,
  openRunUser,
  releaseAdmin,
  signInAdmin,
  switchAdminRoles,
  type AdminRun,
} from '../../support/ui-admin-1';

/**
 * Admin › User Interests, Badges & Surveys: three read-only tabs of a member's
 * details page (UserInterestsSection, UserBadgesSection, UserSurveysSection).
 * Each is read for the run account and compared with what the server holds for
 * it — whatever mWeb's signup saved — so the spec asserts the chips/badges when
 * there are some and the empty line when there are none.
 */

const INTERESTS = `query E2eAdminUserInterests($user_id: ID!) {
  user(user_id: $user_id) { interest_categories { id name level } }
}`;

const BADGES = `query E2eAdminUserBadges($user_id: ID!) { userBadges(user_id: $user_id) { id badge { title } } }`;

const SURVEYS = `query E2eAdminUserSurveys($user_id: ID!) { userSurveyResponses(user_id: $user_id) { kind } }`;

/** UserInterestsSection `levelLabel`. */
const LEVEL_LABEL: Readonly<Record<string, string>> = { SUPER: 'Super', CATEGORY: 'Category', SUB: 'Subcategory' };

describe('Admin · User Interests, Badges & Surveys (City Admin)', { testIsolation: false }, () => {
  let run: AdminRun;

  before(() => {
    adminRun(['CITY_ADMIN']).then((r) => {
      run = r;
    });
  });

  beforeEach(() => {
    signInAdmin(run);
  });

  after(() => releaseAdmin(run));

  it('UIB-01 the Interests tab shows one "<name> · <level>" chip per saved interest, or "No survey interests saved yet."', () => {
    cy.gql<{ user: { interest_categories: { id: string; name: string; level: string }[] } }>(INTERESTS, {
      user_id: run.profile.user_id,
    }).then(({ user }) => {
      openRunUser(run, 'interests');
      const section = () => cy.byTestId('admin-user-interests');
      section().should('contain.text', 'Interests');
      if (user.interest_categories.length === 0) {
        section().should('contain.text', 'No survey interests saved yet.');
      } else {
        for (const c of user.interest_categories) section().should('contain.text', `${c.name} · ${LEVEL_LABEL[c.level] ?? c.level}`);
        section().should('not.contain.text', 'No survey interests saved yet.');
      }
    });
  });

  it('UIB-02 the Badges tab counts the earned badges and names each, or reads "No badges earned yet."', () => {
    cy.gql<{ userBadges: { id: string; badge: { title: string } | null }[] }>(BADGES, { user_id: run.profile.user_id }).then(
      ({ userBadges }) => {
        openRunUser(run, 'badges');
        cy.byTestId('admin-user-badges').should('contain.text', `Badges (${userBadges.length})`);
        if (userBadges.length === 0) cy.byTestId('admin-user-badges').should('contain.text', 'No badges earned yet.');
        for (const ub of userBadges) cy.byTestId('admin-user-badges').should('contain.text', ub.badge?.title ?? '');
      },
    );
  });

  it('UIB-03 the Surveys tab shows each submitted onboarding survey, or "This user hasn\'t submitted any onboarding survey yet."', () => {
    cy.gql<{ userSurveyResponses: { kind: 'VENUE' | 'HOST' }[] }>(SURVEYS, { user_id: run.profile.user_id }).then(
      ({ userSurveyResponses }) => {
        openRunUser(run, 'surveys');
        if (userSurveyResponses.length === 0) {
          cy.byTestId('admin-user-surveys').should('have.text', "This user hasn't submitted any onboarding survey yet.");
        } else {
          for (const r of userSurveyResponses) {
            cy.byTestId(`admin-user-survey-${r.kind}`).should('contain.text', r.kind === 'VENUE' ? 'Venue survey' : 'Host survey');
          }
        }
      },
    );
  });

  // The user-details page admits a Support Agent, and so does every read on it — the surveys included.
  it('UIB-04 a Support Agent reads the surveys the server holds, with no refusal in their place', () => {
    switchAdminRoles(run, ['CITY_ADMIN'], ['SUPPORT_USER']);
    signInAdmin(run);
    cy.interceptOperation('AdminUserSurveys');
    openRunUser(run, 'surveys');
    cy.wait('@AdminUserSurveys').then(({ response }) => {
      expect(response?.body.errors, 'userSurveyResponses answers a Support Agent').to.be.undefined;
      const surveys: { kind: 'VENUE' | 'HOST' }[] = response?.body.data.userSurveyResponses ?? [];
      cy.byTestId('admin-user-surveys-error').should('not.exist');
      if (surveys.length === 0) {
        cy.byTestId('admin-user-surveys').should('have.text', "This user hasn't submitted any onboarding survey yet.");
      } else {
        for (const r of surveys) cy.byTestId(`admin-user-survey-${r.kind}`).should('exist');
      }
    });
  });
});
