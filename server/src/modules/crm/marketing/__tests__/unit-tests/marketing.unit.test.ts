import { marketingResolvers } from '../../marketing.resolver';
import { makeContext } from '@test/harness';

describe('marketing unit', () => {
  it('marketingCampaigns query is gated to admin roles', async () => {
    await expect(
      (async () => (marketingResolvers.Query as any).marketingCampaigns({}, {}, makeContext({ roles: ['USER'] })))()
    ).rejects.toThrow(/access denied/i);
  });
});
