/**
 * How many counter offers each side of a booking may make. Pod Settings sets a
 * total for the booking (6 by default) and it is split equally: the host and the
 * venue may each counter half of it. The host's opening offer is not a counter,
 * an edited counter is still the same one, and a withdrawn counter no longer
 * counts (it leaves the history). Once a side has used its share, it may only
 * accept or reject.
 */
import { GraphQLError } from 'graphql';
import { settingsService } from '@modules/platform/settings/settings.service';
import type { VenueOffer, VenueOfferParty } from './venueOffer.types';
import { countersUsed } from './venueOffer.view';

const OTHER: Record<VenueOfferParty, string> = { HOST: "the venue's", VENUE: "the host's" };

/** Refuses a new counter once the side has used its share (`reason: COUNTER_LIMIT`). */
export async function assertCounterLeft(offer: Pick<VenueOffer, 'history'>, side: VenueOfferParty): Promise<void> {
  const perSide = await settingsService.getVenueOfferCountersPerSide();
  if (countersUsed(offer, side) < perSide) return;
  throw new GraphQLError(`You have used all ${perSide} of your counter offers — accept or reject ${OTHER[side]} terms`, {
    extensions: { code: 'BAD_REQUEST', reason: 'COUNTER_LIMIT', limit: perSide },
  });
}

const perSideByRequest = new WeakMap<object, Promise<number>>();

/** The counters each side may make, read once per GraphQL request (a list of offers asks per row). */
export function requestCountersPerSide(ctx: object): Promise<number> {
  let perSide = perSideByRequest.get(ctx);
  if (!perSide) {
    perSide = settingsService.getVenueOfferCountersPerSide();
    perSideByRequest.set(ctx, perSide);
  }
  return perSide;
}
