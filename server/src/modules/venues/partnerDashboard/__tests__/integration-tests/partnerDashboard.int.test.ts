import { Types } from 'mongoose';
import { partnerDashboardService } from '../../partnerDashboard.service';

describe('partnerDashboardService integration', () => {
  it('returns zeroed metrics for a partner with no data', async () => {
    const result = await partnerDashboardService.get(new Types.ObjectId().toString(), {
      from: '2020-01-01',
      to: '2030-01-01',
    });

    expect(result.summary.number_of_pods).toBe(0);
    expect(result.summary.total_earning).toBe(0);
    expect(result.venue.venue_earning).toBe(0);
    expect(result.host.host_earning).toBe(0);
    expect(result.products.product_earning).toBe(0);
    expect(new Date(result.from).getUTCFullYear()).toBe(2020);
  });
});
