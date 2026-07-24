jest.mock('../../../productReview/productReview.service', () => ({
  productReviewService: {
    summary: jest
      .fn()
      .mockResolvedValue({ product_id: 'p', average_rating: 4.5, total: 2, star_counts: [0, 0, 0, 1, 1] }),
  },
}));

import { inventoryResolvers } from '../../inventory.resolver';
import { productReviewService } from '../../../productReview/productReview.service';
import { makeContext } from '@test/harness';

describe('inventory unit', () => {
  it('InventoryProduct.review_summary delegates to the review service (id or _id)', async () => {
    const byId = await (inventoryResolvers as any).InventoryProduct.review_summary({ id: 'p1' });
    expect(byId.average_rating).toBe(4.5);
    expect(productReviewService.summary).toHaveBeenCalledWith('p1');
    await (inventoryResolvers as any).InventoryProduct.review_summary({ _id: 'p2' });
    expect(productReviewService.summary).toHaveBeenCalledWith('p2');
  });

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
