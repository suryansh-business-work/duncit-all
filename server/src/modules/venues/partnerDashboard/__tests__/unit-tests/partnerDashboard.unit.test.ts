import { Types } from 'mongoose';
import { partnerDashboardService } from '../../partnerDashboard.service';
import { partnerDashboardResolvers } from '../../partnerDashboard.resolver';
import { makeContext } from '@test/harness';

const validId = new Types.ObjectId().toString();

describe('partnerDashboard unit', () => {
  it('requires a valid authenticated user', async () => {
    await expect(
      partnerDashboardService.get('bad', { from: '2020-01-01', to: '2020-02-01' })
    ).rejects.toThrow(/authentication required/i);
  });

  it('rejects an invalid date range', async () => {
    await expect(
      partnerDashboardService.get(validId, { from: 'nope', to: 'also-nope' })
    ).rejects.toThrow(/valid dashboard date range/i);
  });

  it('rejects a reversed date range', async () => {
    await expect(
      partnerDashboardService.get(validId, { from: '2020-02-01', to: '2020-01-01' })
    ).rejects.toThrow(/from date must be before/i);
  });

  it('partnerDashboard query requires authentication', async () => {
    await expect(
      (partnerDashboardResolvers.Query as any).partnerDashboard({}, { from: '2020-01-01', to: '2020-02-01' }, makeContext(null))
    ).rejects.toThrow(/not authenticated/i);
  });
});
