/// <reference types="cypress" />
import type { Translator } from '@duncit/i18n';
import {
  expectNeverSent,
  guardMutation,
  interceptQuery,
  siteBranding,
  visitSite,
  websiteCopy,
  type SiteBranding,
} from '../../../../support/ui-websites';

/**
 * duncit.com/careers (website/main-website/src/pages/careers.astro +
 * components/WebsiteContentList.astro, variant "jobs"): open roles live from
 * the Website portal's CAREERS content and the Apply dialog. No application is
 * ever sent — every submit here is one the browser's validation must stop, and
 * submitJobApplication is refused at the network as a guard in case it does not.
 */

interface Role {
  id: string;
  title: string;
  category: string | null;
  summary: string | null;
}

const CAREERS = `query E2eCareers { publicWebsiteContent(type: CAREERS) { id title category summary } }`;
const DIALOG = 'dialog#applyDialog';

describe('UI duncit.com · Careers', () => {
  let t: Translator['t'];
  let branding: SiteBranding;

  before(() => {
    websiteCopy().then((copy) => {
      t = copy;
    });
    siteBranding().then((found) => {
      branding = found;
    });
  });

  it('CAR-01 the no-role paragraph always links the support email', () => {
    visitSite('main', '/careers');
    cy.contains('main h2', t('website.main.careers.noRoleHeading')).next('p').find(`a[href="mailto:${branding.support_email}"]`)
      .should('readText', branding.support_email);
  });

  describe('with an open role', () => {
    let roles: Role[];

    before(() => {
      cy.gql<{ publicWebsiteContent: Role[] }>(CAREERS, {}, { token: null }).then((data) => {
        roles = data.publicWebsiteContent;
        if (!roles.length) throw new Error('Staging prerequisite: no CAREERS entry is published (Website portal > Careers).');
      });
    });

    const openApply = (role: Role) => {
      cy.get(`[data-apply-role][data-role-id="${role.id}"]`).click();
      cy.get(DIALOG).should('have.attr', 'open');
    };

    it('CAR-02 every published role is listed with its title and an Apply now button', () => {
      interceptQuery('publicWebsiteContent', 'careers');
      visitSite('main', '/careers');
      cy.wait('@careers');
      cy.get('[data-apply-role]').should('have.length', roles.length);
      for (const role of roles) {
        cy.get(`[data-apply-role][data-role-id="${role.id}"]`)
          .should('have.attr', 'data-role-title', role.title)
          .and('contain.text', 'Apply now');
        cy.get('[data-website-content-list]').should('contain.text', role.title);
      }
    });

    it('CAR-03 Apply now opens the dialog titled for that role with every field empty', () => {
      const [role] = roles;
      visitSite('main', '/careers');
      openApply(role);
      cy.get(`${DIALOG} #applyRoleTitle`).should('readText', role.title);
      cy.get(`${DIALOG} p`).first().should('readText', t('website.main.contentList.applyFor'));
      for (const name of ['name', 'email', 'phone', 'resume_url', 'portfolio_url', 'cover_note']) {
        cy.get(`${DIALOG} [name="${name}"]`).should('have.value', '');
      }
      cy.get('#applyFeedback').should('have.class', 'hidden');
    });

    it('CAR-04 the browser refuses a malformed phone and a resume that is not a URL, and nothing is sent', () => {
      const [role] = roles;
      guardMutation('submitJobApplication', 'apply');
      visitSite('main', '/careers');
      openApply(role);
      cy.get(`${DIALOG} [name="name"]`).type('E2E Applicant');
      cy.get(`${DIALOG} [name="email"]`).type('e2e-careers@example.com');
      cy.get(`${DIALOG} [name="phone"]`).type('12ab');
      cy.get(`${DIALOG} [name="resume_url"]`).type('not a url');
      cy.get(`${DIALOG} button[type="submit"]`).click();
      cy.get(`${DIALOG} [name="phone"]`).should(($input) => {
        expect(($input[0] as HTMLInputElement).validity.patternMismatch, 'phone pattern').to.eq(true);
      });
      cy.get(`${DIALOG} [name="resume_url"]`).should(($input) => {
        expect(($input[0] as HTMLInputElement).validity.typeMismatch, 'resume URL').to.eq(true);
      });
      cy.get(DIALOG).should('have.attr', 'open');
      expectNeverSent('apply');
    });

    it('CAR-05 a missing email is stopped too', () => {
      const [role] = roles;
      guardMutation('submitJobApplication', 'apply');
      visitSite('main', '/careers');
      openApply(role);
      cy.get(`${DIALOG} [name="name"]`).type('E2E Applicant');
      cy.get(`${DIALOG} button[type="submit"]`).click();
      cy.get(`${DIALOG} [name="email"]`).should(($input) => {
        expect(($input[0] as HTMLInputElement).validity.valueMissing).to.eq(true);
      });
      expectNeverSent('apply');
    });

    it('CAR-06 the close button shuts the dialog without sending', () => {
      const [role] = roles;
      guardMutation('submitJobApplication', 'apply');
      visitSite('main', '/careers');
      openApply(role);
      cy.get(`${DIALOG} [data-apply-close]`).should('have.attr', 'aria-label', t('website.main.contentList.close')).click();
      cy.get(DIALOG).should('not.have.attr', 'open');
      expectNeverSent('apply');
    });
  });
});
