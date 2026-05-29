import { Types } from 'mongoose';
import { podService } from '../../pod.service';

describe('podService integration', () => {
  it('lists no pods on an empty dataset', async () => {
    expect(await podService.list()).toEqual([]);
  });

  it('returns null for a missing pod id', async () => {
    expect(await podService.getById(new Types.ObjectId().toString())).toBeNull();
  });
});
