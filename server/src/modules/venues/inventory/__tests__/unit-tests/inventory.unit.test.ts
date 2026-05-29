import { inventoryResolvers } from '../../inventory.resolver';
import { makeContext } from '@test/harness';

describe('inventory unit', () => {
  it('inventoryProducts query is gated to admin roles', async () => {
    await expect(
      (async () => (inventoryResolvers.Query as any).inventoryProducts({}, {}, makeContext({ roles: ['USER'] })))()
    ).rejects.toThrow(/access denied/i);
  });
});
