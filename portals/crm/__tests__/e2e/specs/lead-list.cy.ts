import { baseMocks, loginSuccess, sampleVenueLead } from '../support/fixtures';

describe('Venue leads list — row click + super category filter', () => {
  beforeEach(() => {
    cy.mockGraphql({
      ...baseMocks(),
      ConsoleLogin: loginSuccess,
      // The list page issues VenueLeadsTable (DuncitTable); we want to assert
      // that the super_category_id filter flows through. We therefore key the
      // response on `query.filters` so the test can prove the Filters popover
      // actually moved that variable.
      VenueLeadsTable: (vars) => {
        const filters = ((vars as any).query?.filters ?? []) as { field: string; value?: string }[];
        const superCat = filters.find((f) => f.field === 'super_category_id');
        if (superCat?.value === 'cat-music') {
          return { data: { venueLeadsTable: { total: 0, rows: [] } } };
        }
        return { data: { venueLeadsTable: { total: 1, rows: [sampleVenueLead] } } };
      },
    });
    cy.login();
    cy.visit('/venue-leads');
  });

  it('navigates to the detail view when a row is clicked', () => {
    // Wait for the AG Grid row to render, then click anywhere on it (not the
    // action buttons — DuncitTable ignores clicks inside buttons/links).
    cy.contains('div', /sample arena/i, { timeout: 10000 }).should('be.visible');
    cy.contains('.ag-row', /sample arena/i).click();
    cy.location('pathname', { timeout: 8000 }).should('eq', `/venue-leads/${sampleVenueLead.id}/view`);
  });

  it('filters leads when a Super Category filter is applied', () => {
    // Default response returns the seeded venue.
    cy.contains('div', /sample arena/i).should('be.visible');
    // Apply Super Category = Music from the Filters popover — the mock
    // returns an empty list for that id.
    cy.contains('button', /filters/i).click();
    cy.get('[aria-labelledby*="duncit-filter-super_category_id"]').click();
    cy.get('li[role="option"]').contains(/^music$/i).click();
    cy.contains('button', /^apply$/i).click();
    cy.contains('div', /sample arena/i).should('not.exist');
  });
});

describe('Venue lead detail — tabs + manual log composer', () => {
  beforeEach(() => {
    cy.mockGraphql({
      ...baseMocks(),
      ConsoleLogin: loginSuccess,
      // Echo the saved note back so the tab list refreshes with the new
      // entry. The actual `addCrmManualLog` mutation returns a CrmActivity,
      // not the lead; the page refetches VenueLead afterwards to pull the
      // updated activity_log.
      AddCrmManualLog: (vars) => ({
        data: {
          addCrmManualLog: {
            __typename: 'CrmActivity',
            type: 'NOTE',
            summary: (vars as any).input?.summary ?? '',
            status: '',
            target: '',
            body_html: (vars as any).input?.body_html ?? '',
            body_text: (vars as any).input?.body_text ?? '',
            created_by: 'u-admin',
            created_at: new Date().toISOString(),
          },
        },
      }),
    });
    cy.login();
    cy.visit(`/venue-leads/${sampleVenueLead.id}/view`);
  });

  it('renders the hero card and tab strip with overview active by default', () => {
    cy.contains('h5', sampleVenueLead.venue_name).should('be.visible');
    cy.get('[data-testid="venue-lead-tabs"]').should('exist');
    // The default panel is the Overview tab.
    cy.get('[data-testid="lead-tabpanel-overview"]').should('exist');
  });

  it('opens the Manual Logs tab and shows the empty state', () => {
    cy.get('[data-testid="lead-tab-manual-logs"]').click();
    cy.contains(/no manual logs in this window/i, { timeout: 8000 }).should('be.visible');
  });

  it('opens the composer and triggers AddCrmManualLog when saved', () => {
    cy.get('[data-testid="lead-tab-manual-logs"]').click();
    cy.get('[data-testid="manual-log-add"]').click();
    cy.get('[data-testid="manual-log-title"]').type('Called back about Saturday slot');
    // Tiptap renders a contenteditable inside `.ProseMirror`.
    cy.get('.ProseMirror').click().type('They confirmed.');
    cy.get('[data-testid="manual-log-save"]').click();
    // Composer should close on success.
    cy.get('[data-testid="manual-log-add"]', { timeout: 8000 }).should('be.visible');
  });
});
