import { Types } from 'mongoose';
import { paymentService } from '../../payment.service';

describe('paymentService integration', () => {
  it('lists no payments on an empty dataset', async () => {
    expect(await paymentService.list()).toEqual([]);
    expect(await paymentService.listForUser(new Types.ObjectId().toString())).toEqual([]);
  });

  it('returns null for a missing payment id', async () => {
    expect(await paymentService.getById(new Types.ObjectId().toString())).toBeNull();
  });
});
