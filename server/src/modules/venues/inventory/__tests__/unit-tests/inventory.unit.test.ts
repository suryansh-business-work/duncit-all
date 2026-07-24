import { inventoryResolvers } from '../../inventory.resolver';
import { makeContext } from '@test/harness';

describe('inventory unit', () => {
  it('inventoryProducts query is gated to admin roles', async () => {
    await expect(
      (async () => (inventoryResolvers.Query as any).inventoryProducts({}, {}, makeContext({ roles: ['USER'] })))()
    ).rejects.toThrow(/access denied/i);
  });

  it('podsForProduct requires a signed-in buyer', async () => {
    await expect(
      (async () =>
        (inventoryResolvers.Query as any).podsForProduct(
          {},
          { product_doc_id: 'x' },
          makeContext(null)
        ))()
    ).rejects.toThrow(/authenticat/i);
  });
});
