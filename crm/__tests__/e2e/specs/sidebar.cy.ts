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

  // `GroupItem` collapses its children via `<Collapse unmountOnExit>` —
  // children aren't in the DOM until the group is expanded. Click the
  // header to expand before asserting against the children. Only the group
  // that owns the current route auto-expands on mount; others are closed.
  // Using exact-text regex (`^...$`) so "Venue Leads" doesn't accidentally
  // resolve to the child "All Venue Leads" item.
  const expandGroup = (label: RegExp) => {
    cy.get('nav').contains(label).first().click();
  };

  it('exposes both lead groups with their children', () => {
    cy.get('nav').contains(/^\s*Venue Leads\s*$/i).should('be.visible');
    cy.get('nav').contains(/^\s*Host Leads\s*$/i).should('be.visible');

    expandGroup(/^\s*Venue Leads\s*$/i);
    cy.contains(/all venue leads/i).should('be.visible');
    cy.contains(/manage venue services/i).should('be.visible');

    expandGroup(/^\s*Host Leads\s*$/i);
    cy.contains(/all host leads/i).should('be.visible');
    cy.contains(/manage host services/i).should('be.visible');
  });

  it('selects only the most specific child on /host-leads/services', () => {
    expandGroup(/^\s*Host Leads\s*$/i);
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
    expandGroup(/^\s*Venue Leads\s*$/i);
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
