import { baseMocks, loginSuccess, venueServices, hostServices } from '../support/fixtures';

describe('Sidebar navigation', () => {
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
  // children aren't in the DOM until the group is expanded. Click the header
  // to expand first. Exact-text regex so "Leads" doesn't resolve to the child
  // "Venue Leads" / "Host Leads" items.
  const expandGroup = (label: RegExp) => {
    cy.get('nav').contains(label).first().click();
  };

  it('exposes the Leads group with Venue & Host children', () => {
    expandGroup(/^\s*Leads\s*$/i);
    cy.get('nav').contains(/^\s*Venue Leads\s*$/i).should('be.visible');
    cy.get('nav').contains(/^\s*Host Leads\s*$/i).should('be.visible');
  });

  it('navigates to Venue Leads and marks it selected', () => {
    expandGroup(/^\s*Leads\s*$/i);
    cy.get('nav').contains(/^\s*Venue Leads\s*$/i).click();
    cy.location('pathname').should('eq', '/venue-leads');
    cy.get('nav')
      .contains(/^\s*Venue Leads\s*$/i)
      .closest('a, [role="button"]')
      .should('have.class', 'Mui-selected');
  });

  it('navigates to Host Leads', () => {
    expandGroup(/^\s*Leads\s*$/i);
    cy.get('nav').contains(/^\s*Host Leads\s*$/i).click();
    cy.location('pathname').should('eq', '/host-leads');
  });
});
