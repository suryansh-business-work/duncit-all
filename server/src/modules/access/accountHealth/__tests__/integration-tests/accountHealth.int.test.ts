import { Types } from 'mongoose';
import { accountHealthService } from '../../accountHealth.service';

describe('accountHealthService integration', () => {
  it('throws NOT_FOUND for a missing user', async () => {
    await expect(
      accountHealthService.getUserAccountHealth(new Types.ObjectId().toString())
    ).rejects.toThrow(/not found/i);
  });

  it('throws when the current user no longer exists', async () => {
    await expect(
      accountHealthService.getMyAccountHealth(new Types.ObjectId().toString())
    ).rejects.toThrow(/user not found/i);
  });

  it('throws NOT_FOUND for a missing venue', async () => {
    await expect(
      accountHealthService.getVenueHealth(new Types.ObjectId().toString())
    ).rejects.toThrow(/not found/i);
  });
});
