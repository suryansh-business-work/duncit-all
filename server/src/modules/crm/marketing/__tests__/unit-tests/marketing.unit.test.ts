jest.mock('../../marketing.service', () => ({
  marketingService: { remove: jest.fn().mockResolvedValue(true) },
}));

import { marketingResolvers } from '../../marketing.resolver';
import { marketingService } from '../../marketing.service';
import { makeContext } from '@test/harness';

/** Reading a campaign is admin-only; deleting one destroys a send record, so
 * the role check is the only thing standing in front of it. */
const asUser = <T>(run: () => T) => async () => run();

describe('marketing unit', () => {
  it('marketingCampaigns query is gated to admin roles', async () => {
    await expect(
      asUser(() =>
        (marketingResolvers.Query as any).marketingCampaigns({}, {}, makeContext({ roles: ['USER'] })),
      )(),
    ).rejects.toThrow(/access denied/i);
  });

  it('marketingCampaign query is gated to admin roles', async () => {
    await expect(
      asUser(() =>
        (marketingResolvers.Query as any).marketingCampaign(
          {},
          { campaign_id: 'c1' },
          makeContext({ roles: ['USER'] }),
        ),
      )(),
    ).rejects.toThrow(/access denied/i);
  });

  it('marketingCampaignVariables query is gated to admin roles', async () => {
    await expect(
      asUser(() =>
        (marketingResolvers.Query as any).marketingCampaignVariables(
          {},
          {},
          makeContext({ roles: ['USER'] }),
        ),
      )(),
    ).rejects.toThrow(/access denied/i);
  });

  it('deleteMarketingCampaign mutation is gated to admin roles', async () => {
    await expect(
      asUser(() =>
        (marketingResolvers.Mutation as any).deleteMarketingCampaign(
          {},
          { campaign_id: 'c1' },
          makeContext({ roles: ['USER'] }),
        ),
      )(),
    ).rejects.toThrow(/access denied/i);
  });

  // A marketing manager is exactly who this console is for.
  it('lets a marketing manager delete, and passes the id straight through', async () => {
    const ctx = makeContext({ roles: ['MARKETING_MANAGER'] });
    await expect(
      (marketingResolvers.Mutation as any).deleteMarketingCampaign({}, { campaign_id: 'c1' }, ctx),
    ).resolves.toBe(true);
    expect(marketingService.remove).toHaveBeenCalledWith('c1');
  });
});
