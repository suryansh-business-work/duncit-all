import { baseMocks, loginSuccess, venueServices, hostServices } from '../support/fixtures';

describe('Sidebar nested navigation', () => {
  beforeEach(() => {
    cy.mockGraphql({
      ...baseMocks(),
      ConsoleLogin: loginSuccess,
      CrmServices: (vars) =>
        vars.kind === 'HOST' ? { data: { crmServices: hostServices } } : { data: { crmServices: venueServices } },
    });
    cy.login();
  });

  it('exposes both lead groups with their children', () => {
    cy.contains('div', /venue leads/i).should('be.visible');
    cy.contains('div', /host leads/i).should('be.visible');
    cy.contains(/all venue leads/i).should('be.visible');
    cy.contains(/manage venue services/i).should('be.visible');
    cy.contains(/all host leads/i).should('be.visible');
    cy.contains(/manage host services/i).should('be.visible');
  });

  it('selects only the most specific child on /host-leads/services', () => {
    cy.contains(/manage host services/i).click();
    cy.location('pathname').should('eq', '/host-leads/services');

    // Most-specific child wins: "Manage Host Services" is Mui-selected,
    // "All Host Leads" is NOT selected even though /host-leads is a prefix
    // of the current path.
    cy.contains(/manage host services/i)
      .closest('a, [role="button"]')
      .should('have.class', 'Mui-selected');
    cy.contains(/all host leads/i)
      .closest('a, [role="button"]')
      .should('not.have.class', 'Mui-selected');
  });

  it('selects only the most specific child on /venue-leads/services', () => {
    cy.contains(/manage venue services/i).click();
    cy.location('pathname').should('eq', '/venue-leads/services');
    cy.contains(/manage venue services/i)
      .closest('a, [role="button"]')
      .should('have.class', 'Mui-selected');
    cy.contains(/all venue leads/i)
      .closest('a, [role="button"]')
      .should('not.have.class', 'Mui-selected');
  });
});
