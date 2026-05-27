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

  it('reaches the host lead editor and shows the Super Category dropdown', () => {
    cy.contains(/all host leads/i).click();
    cy.location('pathname').should('eq', '/host-leads');
    cy.contains('button', /add host lead|new host lead|create/i).first().click();
    cy.location('pathname').should('include', '/host-leads/new');
    cy.findByLabelLike(/super category/i).should('be.visible');
  });

  it('blocks submit until Super Category is picked', () => {
    cy.visit('/host-leads/new');
    cy.contains('button', /save host lead/i).click();
    cy.contains(/super category is required/i, { timeout: 8000 }).should('be.visible');
  });

  it('creates a host lead with the new required fields filled', () => {
    cy.visit('/host-leads/new');
    cy.findByLabelLike(/super category/i).click({ force: true });
    cy.get('li[role="option"]').contains(/sports/i).click();
    cy.findByLabelLike(/host name/i).type('Cypress Host');
    cy.findByLabelLike(/^name$/i).type('Ravi');
    cy.findByLabelLike(/mobile number/i).type('9811122233');
    cy.contains('button', /save host lead/i).click();
    cy.location('pathname', { timeout: 10000 }).should('not.include', '/new');
  });
});
