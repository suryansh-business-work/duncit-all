/**
 * Create Pod's earnings as a range: beside the projection at the most guests,
 * the same one at the fewest the venue booking allows — tickets for that many
 * (the host's seat free) and the venue paid its amount at that minimum.
 */
import { Types } from 'mongoose';
import { makeContext } from '@test/harness';
import { breakdownService } from '../../breakdown.service';
import { financeResolvers } from '../../finance.resolver';

const hostId = new Types.ObjectId().toString();
const venueId = new Types.ObjectId().toString();

describe('potentialPodEarnings at the fewest guests', () => {
  it('adds the projection at the minimum, priced with the venue’s amount and commission at that minimum', async () => {
    const projection = await breakdownService.potentialPodEarnings(hostId, 800, 20, venueId, 11_000, null, 1100, {
      spots: 8,
      venueAmount: 4400,
      commissionOnTop: 440,
    });
    expect(projection).toMatchObject({ total_spots: 20, payable_spots: 19, waterfall: { amount: 15_200, venue_amount: 11_000 } });
    expect(projection.minimum).toMatchObject({ total_spots: 8, payable_spots: 7, waterfall: { amount: 5600, venue_amount: 4400 } });
    // The low end's commission is the one at the minimum, not the full booking's.
    expect(projection.minimum?.waterfall.host_receives).toBeGreaterThan(
      (await breakdownService.potentialPodEarnings(hostId, 800, 8, venueId, 4400, null, 1100)).waterfall.host_receives
    );
  });

  it("uses the full booking's figures at the minimum when only the head count is given", async () => {
    const projection = await breakdownService.potentialPodEarnings(hostId, 800, 20, venueId, 11_000, null, 1100, {
      spots: 8,
      venueAmount: null,
      commissionOnTop: null,
    });
    expect(projection.minimum?.waterfall.venue_amount).toBe(11_000);
  });

  it('adds nothing when no minimum is asked for, or it is not below the spots', async () => {
    for (const atMinimum of [null, { spots: 20, venueAmount: 1, commissionOnTop: 0 }, { spots: 0, venueAmount: 1, commissionOnTop: 0 }]) {
      const projection = await breakdownService.potentialPodEarnings(hostId, 800, 20, venueId, 11_000, null, 1100, atMinimum);
      expect(projection.minimum).toBeUndefined();
    }
  });

  it('is asked for through the API with min_spots and the venue figures at it', async () => {
    const ctx = makeContext({ id: hostId });
    const resolve = financeResolvers.Query.potentialPodEarnings as (p: unknown, a: unknown, c: unknown) => Promise<{ minimum?: unknown }>;
    const withMin = await resolve(
      {},
      { pod_amount: 800, no_of_spots: 20, venue_id: venueId, venue_amount: 11_000, venue_commission_on_top: 1100, min_spots: 8, venue_amount_at_min: 4400, venue_commission_on_top_at_min: 440 },
      ctx
    );
    expect(withMin.minimum).toMatchObject({ total_spots: 8 });
    const without = await resolve({}, { pod_amount: 800, no_of_spots: 20, venue_id: venueId, venue_amount: 11_000 }, ctx);
    expect(without.minimum).toBeUndefined();
    const onlyCount = await resolve({}, { pod_amount: 800, no_of_spots: 20, venue_id: venueId, venue_amount: 11_000, min_spots: 6 }, ctx);
    expect(onlyCount.minimum).toMatchObject({ total_spots: 6, waterfall: { venue_amount: 11_000 } });
  });
});
