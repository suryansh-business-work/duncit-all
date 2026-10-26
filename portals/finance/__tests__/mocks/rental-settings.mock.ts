import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import {
  RENTAL_SETTINGS,
  UPDATE_RENTAL_SETTINGS,
  type RentalSettings,
  type RentalSettingsInput,
} from '../../src/pages/finance/rented-items-settings-page/queries';

/** Finance > Rented Items > Settings: the stored rules and the write that changes them. */
export const makeRentalSettings = (
  over: Partial<RentalSettings> = {},
): RentalSettings & { __typename: 'RentalSettings' } => ({
  __typename: 'RentalSettings',
  enabled: true,
  terms_html: '<p>Return items clean.</p>',
  commission_pct: 10,
  rent_refundable_on_backout: true,
  deposit_refundable: false,
  booking_cutoff_hours: 24,
  deposit_auto_release_days: 7,
  updated_at: '2026-10-01T10:00:00.000Z',
  ...over,
});

export const rentalSettingsMock = (settings = makeRentalSettings()): MockedResponse => ({
  request: { query: RENTAL_SETTINGS },
  result: { data: { rentalSettings: settings } },
});

export const rentalSettingsErrorMock = (message: string): MockedResponse => ({
  request: { query: RENTAL_SETTINGS },
  result: { errors: [new GraphQLError(message)] },
});

/** Answers the update only when it carries exactly `input`, so a wrong payload fails the test. */
export const updateRentalSettingsMock = (
  input: RentalSettingsInput,
  over: { fail?: string; delay?: number } = {},
): MockedResponse => ({
  request: { query: UPDATE_RENTAL_SETTINGS, variables: { input } },
  ...(over.delay ? { delay: over.delay } : {}),
  result: over.fail
    ? { errors: [new GraphQLError(over.fail)] }
    : { data: { updateRentalSettings: makeRentalSettings({ ...input }) } },
});
