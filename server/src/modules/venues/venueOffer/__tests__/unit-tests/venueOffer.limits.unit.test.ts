/**
 * How many counter offers each side of a booking may make: half the platform's
 * total each. The host's opening offer is not a counter and the other side's
 * counters never count against this one; once a side has used its share it may
 * only accept or reject. The share is read once per GraphQL request.
 */
jest.mock('@modules/platform/settings/settings.service', () => ({
  settingsService: { getVenueOfferCountersPerSide: jest.fn() },
}));

import type { GraphQLError } from 'graphql';
import { settingsService } from '@modules/platform/settings/settings.service';
import { assertCounterLeft, requestCountersPerSide } from '../../venueOffer.limits';
import type { VenueOfferHistoryEntry } from '../../venueOffer.types';

const perSide = settingsService.getVenueOfferCountersPerSide as jest.Mock;

const at = new Date('2027-01-01T10:00:00.000Z');
const step = (by: 'HOST' | 'VENUE', action: VenueOfferHistoryEntry['action'] = 'COUNTER'): VenueOfferHistoryEntry => ({
  by,
  action,
  model: 'PER_GUEST',
  rate: 500,
  total: 11_000,
  note: '',
  at,
});

async function refusal(promise: Promise<unknown>): Promise<GraphQLError> {
  try {
    await promise;
  } catch (error) {
    return error as GraphQLError;
  }
  throw new Error('expected the counter to be refused');
}

beforeEach(() => {
  perSide.mockResolvedValue(3);
});

describe('assertCounterLeft', () => {
  it('lets a side counter while it has made fewer counters than its share', async () => {
    const history = [step('HOST', 'OFFER'), step('VENUE'), step('HOST'), step('VENUE')];
    await expect(assertCounterLeft({ history }, 'VENUE')).resolves.toBeUndefined();
    await expect(assertCounterLeft({ history }, 'HOST')).resolves.toBeUndefined();
  });

  it("refuses the venue once it has used its share, naming the limit and pointing at the host's terms", async () => {
    const history = [step('HOST', 'OFFER'), step('VENUE'), step('HOST'), step('VENUE'), step('HOST'), step('VENUE')];
    const error = await refusal(assertCounterLeft({ history }, 'VENUE'));
    expect(error.message).toBe("You have used all 3 of your counter offers — accept or reject the host's terms");
    expect(error.extensions).toEqual({ code: 'BAD_REQUEST', reason: 'COUNTER_LIMIT', limit: 3 });
  });

  it("refuses the host the same way, pointing at the venue's terms", async () => {
    perSide.mockResolvedValue(1);
    const error = await refusal(assertCounterLeft({ history: [step('HOST', 'OFFER'), step('VENUE'), step('HOST'), step('VENUE')] }, 'HOST'));
    expect(error.message).toBe("You have used all 1 of your counter offers — accept or reject the venue's terms");
    expect(error.extensions).toMatchObject({ reason: 'COUNTER_LIMIT', limit: 1 });
  });

  it("never counts the host's opening offer or the other side's counters", async () => {
    perSide.mockResolvedValue(1);
    const history = [step('HOST', 'OFFER'), step('VENUE'), step('VENUE'), step('VENUE')];
    await expect(assertCounterLeft({ history }, 'HOST')).resolves.toBeUndefined();
  });

  it('reads an offer from before history was kept as no counters made', async () => {
    perSide.mockResolvedValue(1);
    await expect(assertCounterLeft({ history: undefined as never }, 'VENUE')).resolves.toBeUndefined();
  });
});

describe('requestCountersPerSide', () => {
  it('reads the share once per request, however many offers the request lists', async () => {
    const request = {};
    await expect(requestCountersPerSide(request)).resolves.toBe(3);
    await expect(requestCountersPerSide(request)).resolves.toBe(3);
    expect(perSide).toHaveBeenCalledTimes(1);
  });

  it('reads it again for the next request, which sees a changed setting', async () => {
    await expect(requestCountersPerSide({})).resolves.toBe(3);
    perSide.mockResolvedValue(5);
    await expect(requestCountersPerSide({})).resolves.toBe(5);
    expect(perSide).toHaveBeenCalledTimes(2);
  });
});
