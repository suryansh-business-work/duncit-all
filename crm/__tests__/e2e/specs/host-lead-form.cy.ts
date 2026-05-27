import { baseMocks, loginSuccess, sampleHostLead } from '../support/fixtures';

describe('Host lead — create flow', () => {
  beforeEach(() => {
    cy.mockGraphql({
      ...baseMocks(),
      ConsoleLogin: loginSuccess,
      CreateHostLead: (vars) => ({
        data: {
          createHostLead: {
            ...sampleHostLead,
            id: 'h-new',
            host_name: (vars as any).input?.host_name ?? 'Untitled',
          },
        },
      }),
    });
    cy.login();
  });

  it('reaches the host editor and shows the Super Category dropdown', () => {
    cy.visit('/host-leads/new');
    cy.contains(/super category/i).should('be.visible');
  });

  it('blocks submit until Super Category is picked', () => {
    cy.visit('/host-leads/new');
    cy.contains('button', /create host lead/i).click();
    cy.contains(/super category is required/i, { timeout: 8000 }).should('be.visible');
  });

  it('creates a host lead with the new required fields filled', () => {
    cy.visit('/host-leads/new');
    cy.pickMuiOption(/super category/i, /sports/i);
    cy.get('input[name="host_name"]').type('Cypress Host');
    cy.get('input[name="contacts.0.name"]').type('Ravi');
    cy.get('input[name="contacts.0.mobile_number"]').type('9811122233');
    cy.contains('button', /create host lead/i).click();
    cy.location('pathname', { timeout: 10000 }).should('not.include', '/new');
  });
});
