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
    cy.contains('button', /create venue lead/i).click();
    cy.contains(/super category is required/i, { timeout: 8000 }).should('be.visible');
  });
});
