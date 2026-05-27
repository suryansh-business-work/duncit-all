import { baseMocks, loginSuccess, venueServices } from '../support/fixtures';

describe('Manage Venue Services — CRUD', () => {
  beforeEach(() => {
    // Track the current catalogue per-test so create/update/delete can
    // mutate the array in place and the next `CrmServices` query returns
    // the updated list. Each spec gets its own copy.
    const catalogue = venueServices.map((s) => ({ ...s }));

    cy.mockGraphql({
      ...baseMocks(),
      ConsoleLogin: loginSuccess,
      CrmServices: () => ({ data: { crmServices: catalogue } }),
      CreateCrmService: (vars) => {
        const input = (vars as any).input ?? {};
        const created = {
          __typename: 'CrmService',
          id: `svc-${catalogue.length + 1}`,
          name: input.name,
          kind: input.kind,
          sort_order: input.sort_order ?? 0,
          is_active: input.is_active !== false,
        };
        catalogue.push(created as any);
        return { data: { createCrmService: created } };
      },
      UpdateCrmService: (vars) => {
        const id = (vars as any).id;
        const input = (vars as any).input ?? {};
        const idx = catalogue.findIndex((s) => s.id === id);
        if (idx >= 0) catalogue[idx] = { ...catalogue[idx], ...input };
        return { data: { updateCrmService: catalogue[idx] } };
      },
      DeleteCrmService: (vars) => {
        const id = (vars as any).id;
        const idx = catalogue.findIndex((s) => s.id === id);
        if (idx >= 0) catalogue.splice(idx, 1);
        return { data: { deleteCrmService: true } };
      },
    });
    cy.login();
    cy.visit('/venue-leads/services');
  });

  it('shows the seeded catalogue with each service name', () => {
    cy.contains(/manage venue services/i).should('be.visible');
    cy.contains('td', 'Catering').should('be.visible');
    cy.contains('td', 'DJ / Music').should('be.visible');
  });

  it('adds a new service', () => {
    cy.contains('button', /add service/i).click();
    cy.get('input[placeholder*="Coaching" i], input[placeholder*="e.g." i]').first().type('Bouncer / Security');
    // The draft row's "Save" button surfaces a SaveIcon — MUI auto-sets
    // data-testid="SaveIcon" on the SVG, which is the most stable target.
    cy.get('[data-testid="SaveIcon"]').first().click({ force: true });
    cy.contains('td', /bouncer \/ security/i, { timeout: 8000 }).should('be.visible');
  });

  it('deletes a service via the confirm dialog', () => {
    cy.contains('td', 'Catering')
      .parent()
      .find('[data-testid="DeleteIcon"]')
      .click({ force: true });
    cy.contains(/delete service/i).should('be.visible');
    cy.contains('button', /^delete$/i).click();
    cy.contains('td', 'Catering').should('not.exist');
  });
});
