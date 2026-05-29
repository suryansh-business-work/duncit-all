import { analyticsResolvers } from '../../analytics.resolver';
import { makeContext } from '@test/harness';

describe('analytics unit', () => {
  it('dashboardTotals is gated to admin roles', async () => {
    await expect(
      (async () => (analyticsResolvers.Query as any).dashboardTotals({}, {}, makeContext({ roles: ['USER'] })))()
    ).rejects.toThrow(/access denied/i);
  });

  it('activeUserStats is gated to admin roles', async () => {
    await expect(
      (async () => (analyticsResolvers.Query as any).activeUserStats({}, {}, makeContext({ roles: ['USER'] })))()
    ).rejects.toThrow(/access denied/i);
  });
});
