import { pickVenue } from '@duncit/utils';
import {
  chooseOption,
  copyOf,
  countOperation,
  expectNotSent,
  findPartnerWorld,
  loadCopy,
  rememberVenue,
  signInPartner,
  type PartnerWorld,
} from '../../support/partner-world-1';

/**
 * Partners · Venue cancellation policy (/venues/settings), edited on the run's
 * APPROVED venue only. Each scenario writes the policy it starts from through
 * the same mutation the page saves with, and after() puts the venue's original
 * policy back — the mWeb and native specs read the same venue's policy. The
 * draft venue's policy is only looked at.
 *
 * Not here: an owner with no venues (the run account owns two).
 */

type ChargeType = 'PERCENT' | 'AMOUNT';
interface Tier {
  hours_before: number;
  charge_type: ChargeType;
  value: number;
}
interface Policy {
  reschedule_only: boolean;
  tiers: Tier[];
}
interface VenuePolicy {
  id: string;
  status: string;
  settings: { cancellation: Policy };
}

const POLICY_FIELDS = 'cancellation { reschedule_only tiers { hours_before charge_type value } }';
const POLICIES = `query E2eUiVenuePolicies { myVenues { id status settings { ${POLICY_FIELDS} } } }`;
const SET_POLICY = `mutation E2eUiSetVenuePolicy($id: ID!, $input: VenueSettingsInput!) {
  updateVenueSettings(venue_doc_id: $id, input: $input) { id settings { ${POLICY_FIELDS} } }
}`;

const EMPTY: Policy = { reschedule_only: false, tiers: [] };
const DAY_BAND: Tier = { hours_before: 24, charge_type: 'PERCENT', value: 50 };
const LATE_BAND: Tier = { hours_before: 6, charge_type: 'AMOUNT', value: 200 };

const copy = {
  noBands: () => copyOf('venueSettings.noBands', 'No charges yet — cancelling is free at any time.'),
  saved: () => copyOf('venueSettings.saved', 'Cancellation policy saved.'),
  disabled: () =>
    copyOf('venueSettings.policyDisabled', 'Cancellation charges are off because this venue is reschedule-only.'),
  duplicate: () => copyOf('venueSettings.validation.duplicateWindow', 'Another band already covers this window'),
  percentMax: () => copyOf('venueSettings.validation.percentMax', 'A percentage cannot go above 100'),
};

/** The policies of every venue the account owns. */
const policies = (): Cypress.Chainable<VenuePolicy[]> =>
  cy.gql<{ myVenues: VenuePolicy[] }>(POLICIES).then(({ myVenues }) => myVenues);

const setPolicy = (venueId: string, policy: Policy): void => {
  cy.gql(SET_POLICY, { id: venueId, input: { cancellation: policy } });
};

/** Open the settings page on `venueId` (remembered) and wait for its venues. */
function openSettings(venueId: string): void {
  rememberVenue(venueId);
  cy.interceptOperation('MyVenuesSettings');
  cy.visitApp('/venues/settings');
  cy.wait('@MyVenuesSettings');
  cy.byTestId('venue-settings-venue').find('input').should('have.value', venueId);
}

const tierInput = (index: number, field: 'hours' | 'value') =>
  cy.byTestId(`cancellation-tier-${index}-${field}`).find('input');

describe('Partners UI · Venue cancellation policy', () => {
  let world: PartnerWorld;
  let original: Policy | null = null;

  before(() => {
    signInPartner();
    loadCopy();
    findPartnerWorld().then((found) => {
      world = found;
      policies().then((rows) => {
        const own = rows.find((row) => row.id === found.venue.id);
        if (!own) throw new Error('The approved venue is missing from myVenues.');
        original = own.settings.cancellation;
      });
    });
  });

  beforeEach(() => {
    signInPartner();
  });

  after(() => {
    if (!original) return;
    signInPartner();
    setPolicy(world.venue.id, original);
  });

  it('VC-01 with nothing remembered the page opens on the default venue, never an empty form', () => {
    cy.interceptOperation('MyVenuesSettings');
    cy.visitApp('/venues/settings');
    cy.wait('@MyVenuesSettings').then(({ response }) => {
      const rows: Array<{ id: string; status: string }> = response?.body?.data?.myVenues ?? [];
      const opened = pickVenue(rows, null);
      expect(opened, 'the default venue').to.not.equal(null);
      cy.byTestId('venue-settings-venue').find('input').should('have.value', opened?.id);
    });
    cy.byTestId('venue-settings-title').should('have.text', copyOf('venueSettings.title', 'Venue settings'));
    cy.byTestId('cancellation-save').should('be.visible');
  });

  it('VC-02 two bands added and saved come back widest window first', () => {
    setPolicy(world.venue.id, EMPTY);
    openSettings(world.venue.id);
    cy.byTestId('cancellation-no-bands').should('have.text', copy.noBands());
    cy.byTestId('cancellation-add-band').click();
    tierInput(0, 'hours').should('have.value', '24').clear().type('6');
    cy.byTestId('cancellation-add-band').click();
    tierInput(1, 'hours').should('have.value', '24');
    cy.byTestId('cancellation-no-bands').should('not.exist');
    cy.interceptOperation('UpdateVenueCancellation');
    cy.byTestId('cancellation-save').click();
    cy.wait('@UpdateVenueCancellation').then(({ request, response }) => {
      const sent: Tier[] = request.body.variables.input.cancellation.tiers;
      expect(sent.map((tier) => tier.hours_before), 'bands sent').to.deep.equal([6, 24]);
      const stored: Tier[] = response?.body?.data?.updateVenueSettings?.settings?.cancellation?.tiers ?? [];
      expect(stored, 'bands stored').to.deep.equal([
        { hours_before: 24, charge_type: 'PERCENT', value: 50 },
        { hours_before: 6, charge_type: 'PERCENT', value: 50 },
      ]);
    });
    cy.byTestId('venue-settings-snackbar').should('contain.text', copy.saved());
    tierInput(0, 'hours').should('have.value', '24');
    tierInput(1, 'hours').should('have.value', '6');
  });

  it('VC-03 a repeated window and a percentage over 100 are refused on the rows before any request', () => {
    const save = countOperation('UpdateVenueCancellation');
    setPolicy(world.venue.id, EMPTY);
    openSettings(world.venue.id);
    cy.byTestId('cancellation-add-band').click();
    cy.byTestId('cancellation-add-band').click();
    tierInput(0, 'value').clear().type('150');
    cy.byTestId('cancellation-save').click();
    cy.byTestId('cancellation-tier-1-hours').should('contain.text', copy.duplicate());
    cy.byTestId('cancellation-tier-0-value').should('contain.text', copy.percentMax());
    expectNotSent(save, 'UpdateVenueCancellation');
  });

  it('VC-04 Reschedule only greys the bands out without deleting them, and unticking restores them', () => {
    setPolicy(world.venue.id, { reschedule_only: false, tiers: [DAY_BAND] });
    openSettings(world.venue.id);
    cy.byTestId('cancellation-reschedule-only').find('input').check();
    cy.byTestId('cancellation-policy-disabled').should('have.text', copy.disabled());
    tierInput(0, 'hours').should('be.disabled').and('have.value', '24');
    tierInput(0, 'value').should('be.disabled').and('have.value', '50');
    cy.byTestId('cancellation-add-band').should('be.disabled');
    cy.byTestId('cancellation-tier-0-remove').should('be.disabled');
    cy.byTestId('cancellation-reschedule-only').find('input').uncheck();
    cy.byTestId('cancellation-policy-disabled').should('not.exist');
    tierInput(0, 'hours').should('be.enabled').and('have.value', '24');
    tierInput(0, 'value').should('be.enabled').and('have.value', '50');
  });

  it('VC-05 a removed band is gone from the saved policy', () => {
    setPolicy(world.venue.id, { reschedule_only: false, tiers: [DAY_BAND, LATE_BAND] });
    openSettings(world.venue.id);
    tierInput(1, 'hours').should('have.value', '6');
    cy.byTestId('cancellation-tier-1-remove').click();
    cy.byTestId('cancellation-tier-1-hours').should('not.exist');
    cy.interceptOperation('UpdateVenueCancellation');
    cy.byTestId('cancellation-save').click();
    cy.wait('@UpdateVenueCancellation');
    policies().then((rows) => {
      const own = rows.find((row) => row.id === world.venue.id);
      expect(own?.settings.cancellation.tiers, 'the saved bands').to.deep.equal([DAY_BAND]);
    });
  });

  it('VC-06 switching venues shows each venue’s own policy and changes neither', () => {
    setPolicy(world.venue.id, { reschedule_only: false, tiers: [LATE_BAND] });
    policies().then((rows) => {
      const draft = rows.find((row) => row.id === world.draftVenue.id);
      if (!draft) throw new Error('The draft venue is missing from myVenues.');
      openSettings(world.venue.id);
      tierInput(0, 'hours').should('have.value', '6');
      chooseOption('venue-settings-venue', world.draftVenue.id);
      cy.byTestId('venue-settings-venue').find('input').should('have.value', world.draftVenue.id);
      const draftTiers = draft.settings.cancellation.tiers;
      if (draftTiers.length === 0) {
        cy.byTestId('cancellation-no-bands').should('have.text', copy.noBands());
      } else {
        tierInput(0, 'hours').should('have.value', String(draftTiers[0].hours_before));
      }
      cy.byTestId('cancellation-tier-0-hours').should(draftTiers.length === 0 ? 'not.exist' : 'exist');
      policies().then((later) => {
        expect(later.find((row) => row.id === world.venue.id)?.settings.cancellation.tiers, 'approved venue').to.deep.equal([
          LATE_BAND,
        ]);
        expect(later.find((row) => row.id === world.draftVenue.id)?.settings.cancellation, 'draft venue').to.deep.equal(
          draft.settings.cancellation,
        );
      });
    });
  });
});
