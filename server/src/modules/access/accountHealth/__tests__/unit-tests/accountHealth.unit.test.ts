import { Types } from 'mongoose';
import { accountHealthService } from '../../accountHealth.service';
import { accountHealthResolvers } from '../../accountHealth.resolver';
import { makeContext } from '@test/harness';

describe('accountHealth unit', () => {
  it('getUserAccountHealth rejects an invalid user id', async () => {
    await expect(accountHealthService.getUserAccountHealth('bad')).rejects.toThrow(/invalid user_id/i);
  });

  it('getMyVenueHealth rejects an invalid venue id', async () => {
    await expect(
      accountHealthService.getMyVenueHealth(new Types.ObjectId().toString(), 'bad')
    ).rejects.toThrow(/invalid venue_id/i);
  });

  it('myAccountHealth requires authentication', () => {
    expect(() =>
      (accountHealthResolvers.Query as any).myAccountHealth({}, {}, makeContext(null))
    ).toThrow(/not authenticated/i);
  });

  it('userAccountHealth is gated to admin roles', () => {
    expect(() =>
      (accountHealthResolvers.Query as any).userAccountHealth({}, { user_id: 'x' }, makeContext({ roles: ['USER'] }))
    ).toThrow(/access denied/i);
  });
});
