import { baseMocks, loginSuccess, sampleVenueLead } from '../support/fixtures';

describe('Venue lead — create flow', () => {
  beforeEach(() => {
    cy.mockGraphql({
      ...baseMocks(),
      ConsoleLogin: loginSuccess,
      CreateVenueLead: (vars) => ({
        data: {
          createVenueLead: {
            ...sampleVenueLead,
            id: 'v-new',
            venue_name: (vars as any).input?.venue_name ?? 'Untitled',
          },
        },
      }),
    });
    cy.login();
  });

  it('reaches the editor and shows the new Super Category dropdown', () => {
    cy.visit('/venue-leads/new');
    cy.contains(/super category/i).should('be.visible');
  });

  it('blocks submit until Super Category is picked', () => {
    cy.visit('/venue-leads/new');
    cy.contains('button', /save venue lead/i).click();
    cy.contains(/super category is required/i, { timeout: 8000 }).should('be.visible');
  });

  it('creates a lead with super category, name, address and primary contact', () => {
    cy.visit('/venue-leads/new');

    cy.pickMuiOption(/super category/i, /sports/i);

    cy.get('input[name="venue_name"]').type('Cypress Arena');
    cy.pickMuiOption(/venue type/i, /banquet hall/i);
    cy.get('input[name="city"]').type('Bengaluru');
    cy.get('textarea[name="full_address"], input[name="full_address"]').first().type('12 Cypress Road');
    cy.get('input[name="contacts.0.name"]').type('Asha');
    cy.get('input[name="contacts.0.mobile_number"]').type('9876543210');

    cy.contains('button', /save venue lead/i).click();
    cy.location('pathname', { timeout: 10000 }).should('not.include', '/new');
  });
});
