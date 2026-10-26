/// <reference types="cypress" />
import { expectRefused } from '../../../support/access-steps';
import { expectAnswer, refusal } from '../../../support/api-apps';
import { ensureVenue, signInRunPartner, type FixtureVenue } from '../../../support/fixture-world';

/**
 * Venue settings and the cancellation policy, saved by the owner of the run's
 * own venue. Scenario map: Partners › Venue cancellation policy ("Server
 * refuses an invalid policy").
 *
 * venue.service.ts updateSettings checks ownership, then normalizeSettingsInput
 * re-validates whatever part was sent — operating hours (HH:mm, opening before
 * closing), weekly off days (0-6), leave dates (YYYY-MM-DD) and the charge
 * bands (a percent up to 100, an amount up to 1,000,000, one band per window) —
 * and stores the bands widest window first. The auto-cancel window and refund
 * ladder are Onboarding's / Finance's: the owner may send them back unchanged
 * but never move them. Whatever this spec saves it puts back before it ends,
 * so the venue's slots and pods are judged as before.
 */

const SAVE = `mutation E2eFixtureVenueSettings($id: ID!, $input: VenueSettingsInput!) {
  updateVenueSettings(venue_doc_id: $id, input: $input) {
    settings {
      operating_hours { open close }
      weekly_off_days
      cancellation { reschedule_only tiers { hours_before charge_type value } }
    }
  }
}`;
const READ = `query E2eFixtureVenueSettingsRead($id: ID) {
  myVenue(venue_id: $id) {
    settings {
      operating_hours { open close }
      weekly_off_days
      cancellation { reschedule_only tiers { hours_before charge_type value } }
    }
  }
}`;

/** Duncit's half of the policy — set by Onboarding / Finance, never the owner. */
const AUTO_CANCEL = `query E2eFixtureVenueAutoCancel($id: ID) {
  myVenue(venue_id: $id) {
    settings { cancellation { trigger_hours refund_tiers { hours_before refund_pct } } }
  }
}`;
const AUTO_CANCEL_REFUSED = 'Only Onboarding or Finance can change the auto-cancel window and refund ladder';

const bad = (message: string) => refusal('BAD_USER_INPUT', message);

describe('API · Venue settings: the owner’s policy, validated before it is stored', { testIsolation: false }, () => {
  let token = '';
  let venue: FixtureVenue;
  let original: Record<string, unknown>;

  const save = (input: Record<string, unknown>) => cy.gqlRaw(SAVE, { id: venue.id, input }, { token });

  before(() => {
    signInRunPartner().then((partner) => {
      token = partner;
      ensureVenue(partner).then((found) => {
        venue = found;
        cy.gql(READ, { id: found.id }, { token: partner }).then(({ myVenue }) => {
          original = myVenue.settings;
        });
      });
    });
  });

  it('VST-01 a charge band above its ceiling, or two bands on one window, is refused', () => {
    const band = (hours: number, type: string, value: number) => ({ hours_before: hours, charge_type: type, value });
    save({ cancellation: { tiers: [band(24, 'PERCENT', 150)] } }).then((body) =>
      expectRefused('updateVenueSettings', body, bad('cancellation charge must be between 0 and 100')),
    );
    save({ cancellation: { tiers: [band(24, 'AMOUNT', 2_000_000)] } }).then((body) =>
      expectRefused('updateVenueSettings', body, bad('cancellation charge must be between 0 and 1000000')),
    );
    save({ cancellation: { tiers: [band(24, 'PERCENT', 10), band(24, 'AMOUNT', 100)] } }).then((body) =>
      expectRefused('updateVenueSettings', body, bad('each cancellation band needs its own "hours before" window')),
    );
  });

  it('VST-02 malformed operating hours, off days and leave dates are refused', () => {
    save({ operating_hours: { open: '25:00', close: '23:00' } }).then((body) =>
      expectRefused('updateVenueSettings', body, bad('Operating hours must be HH:mm (24-hour)')),
    );
    save({ operating_hours: { open: '18:00', close: '09:00' } }).then((body) =>
      expectRefused('updateVenueSettings', body, bad('Opening time must be before closing time')),
    );
    save({ weekly_off_days: [7] }).then((body) =>
      expectRefused('updateVenueSettings', body, bad('weekly_off_days must be integers 0..6 (Sun..Sat)')),
    );
    save({ holidays: ['next-friday'] }).then((body) =>
      expectRefused('updateVenueSettings', body, bad('holidays must be YYYY-MM-DD dates')),
    );
  });

  it('VST-03 a valid policy is stored with its bands widest window first, and reads back the same', () => {
    const input = {
      operating_hours: { open: '08:00', close: '22:00' },
      weekly_off_days: [3, 0, 3],
      cancellation: {
        reschedule_only: false,
        tiers: [
          { hours_before: 24, charge_type: 'PERCENT', value: 50 },
          { hours_before: 72, charge_type: 'AMOUNT', value: 100 },
        ],
      },
    };
    const stored = {
      operating_hours: { open: '08:00', close: '22:00' },
      weekly_off_days: [0, 3],
      cancellation: {
        reschedule_only: false,
        tiers: [
          { hours_before: 72, charge_type: 'AMOUNT', value: 100 },
          { hours_before: 24, charge_type: 'PERCENT', value: 50 },
        ],
      },
    };
    save(input).then((body) => expectAnswer('updateVenueSettings', body, { settings: stored }));
    cy.gqlRaw(READ, { id: venue.id }, { token }).then((body) => expectAnswer('myVenue', body, { settings: stored }));
  });

  it('VST-04 a reschedule-only venue keeps its bands, and the owner can put everything back', () => {
    cy.gql(READ, { id: venue.id }, { token }).then(({ myVenue }) => {
      const current = myVenue.settings;
      const rescheduleOnly = { ...current, cancellation: { ...current.cancellation, reschedule_only: true } };
      save({ cancellation: { reschedule_only: true } }).then((body) =>
        expectAnswer('updateVenueSettings', body, { settings: rescheduleOnly }),
      );
    });
    cy.then(() => save(original)).then((body) => expectAnswer('updateVenueSettings', body, { settings: original }));
  });

  it('VST-05 the owner cannot move the auto-cancel window or refund ladder, but may send them back unchanged', () => {
    cy.gql(AUTO_CANCEL, { id: venue.id }, { token }).then(({ myVenue }) => {
      const terms = myVenue.settings.cancellation;
      const forbidden = refusal('FORBIDDEN', AUTO_CANCEL_REFUSED);
      const otherTrigger = terms.trigger_hours === 0 ? 1 : terms.trigger_hours - 1;
      const otherLadder = terms.refund_tiers.length > 0 ? [] : [{ hours_before: 24, refund_pct: 50 }];
      save({ cancellation: { trigger_hours: otherTrigger } }).then((body) =>
        expectRefused('updateVenueSettings', body, forbidden),
      );
      save({ cancellation: { refund_tiers: otherLadder } }).then((body) =>
        expectRefused('updateVenueSettings', body, forbidden),
      );
      // The rest of the form still saves when the terms ride along unchanged.
      save({ operating_hours: original.operating_hours, cancellation: terms }).then((body) =>
        expectAnswer('updateVenueSettings', body, { settings: original }),
      );
      cy.gqlRaw(AUTO_CANCEL, { id: venue.id }, { token }).then((body) =>
        expectAnswer('myVenue', body, { settings: { cancellation: terms } }),
      );
    });
  });
});
