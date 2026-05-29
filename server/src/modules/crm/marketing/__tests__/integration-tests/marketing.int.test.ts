import { marketingService } from '../../marketing.service';

describe('marketingService integration', () => {
  it('lists no campaigns on an empty dataset', async () => {
    expect(await marketingService.list()).toEqual([]);
  });
});
