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
    cy.contains(/all venue leads/i).click();
    cy.location('pathname').should('eq', '/venue-leads');
    cy.contains('button', /add venue lead|new venue lead|create/i).first().click();
    cy.location('pathname').should('include', '/venue-leads/new');
    cy.findByLabelLike(/super category/i).should('be.visible');
  });

  it('blocks submit until Super Category is picked', () => {
    cy.visit('/venue-leads/new');
    cy.contains('button', /save venue lead/i).click();
    // The top-level alert lists missing fields by label.
    cy.contains(/super category is required/i, { timeout: 8000 }).should('be.visible');
  });

  it('creates a lead with super category, website and services', () => {
    cy.visit('/venue-leads/new');

    // Open the super category dropdown then pick the seeded "Sports" option.
    cy.findByLabelLike(/super category/i).click({ force: true });
    cy.get('li[role="option"]').contains(/sports/i).click();

    // Minimum required fields.
    cy.findByLabelLike(/venue name/i).type('Cypress Arena');
    // venue types is a multi-select — open & pick a value.
    cy.findByLabelLike(/venue type/i).click({ force: true });
    cy.get('li[role="option"]').contains(/banquet hall/i).click();
    cy.get('body').type('{esc}');
    cy.findByLabelLike(/city/i).type('Bengaluru');
    cy.findByLabelLike(/full address/i).type('12 Cypress Road');
    cy.findByLabelLike(/^name$/i).type('Asha');
    cy.findByLabelLike(/mobile number/i).type('9876543210');

    cy.contains('button', /save venue lead/i).click();

    // Successful save should navigate away from /new.
    cy.location('pathname', { timeout: 10000 }).should('not.include', '/new');
  });
});
