import { Types } from 'mongoose';
import { productReviewService } from '../../productReview.service';
import { ProductReviewModel } from '../../productReview.model';
import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import { EcommBrandModel } from '@modules/venues/ecommBrand/ecommBrand.model';
import { UserModel } from '@modules/access/user/user.model';

describe('productReviewService integration', () => {
  it('creates one review per user, summarises stars, votes, and gates the seller reply', async () => {
    const productId = new Types.ObjectId();
    const brandId = new Types.ObjectId();
    const userA = new Types.ObjectId();
    const userB = new Types.ObjectId();
    const seller = new Types.ObjectId();
    await UserModel.collection.insertOne({ _id: userA, auth: {}, profile: { first_name: 'Asha', last_name: 'R' } } as never);
    await UserModel.collection.insertOne({ _id: userB, auth: {}, profile: { first_name: 'Bob' } } as never);
    await EcommBrandModel.collection.insertOne({ _id: brandId, owner_user_id: seller } as never);
    await InventoryProductModel.collection.insertOne({ _id: productId, product_name: 'Tee', sku: 'TEE1', brand_id: brandId } as never);

    const r = await productReviewService.create(userA.toString(), { product_id: productId.toString(), rating: 4, comment: 'Nice', images: ['https://cdn/x.jpg'] });
    expect(r.user_name).toBe('Asha R');
    expect(r.rating).toBe(4);
    expect(r.images).toEqual(['https://cdn/x.jpg']);

    // Re-review updates the same row (one per user/product).
    const r2 = await productReviewService.create(userA.toString(), { product_id: productId.toString(), rating: 5 });
    expect(r2.id).toBe(r.id);
    expect(r2.rating).toBe(5);
    expect(await ProductReviewModel.countDocuments({ product_id: productId })).toBe(1);

    await productReviewService.create(userB.toString(), { product_id: productId.toString(), rating: 3 });

    const summary = await productReviewService.summary(productId.toString());
    expect(summary.total).toBe(2);
    expect(summary.average_rating).toBe(4); // (5 + 3) / 2
    expect(summary.star_counts[4]).toBe(1); // one 5★
    expect(summary.star_counts[2]).toBe(1); // one 3★

    // Vote up, then switch to down (a single active vote per user).
    const up = await productReviewService.vote(userB.toString(), r.id, 1);
    expect(up.up_votes).toBe(1);
    const down = await productReviewService.vote(userB.toString(), r.id, -1);
    expect(down.up_votes).toBe(0);
    expect(down.down_votes).toBe(1);
    const list = await productReviewService.listByProduct(productId.toString(), userB.toString());
    expect(list.find((x) => x.id === r.id)?.my_vote).toBe(-1);

    // Only the product's brand owner may reply.
    await expect(productReviewService.reply(userA.toString(), r.id, 'thanks')).rejects.toThrow(/seller/i);
    const replied = await productReviewService.reply(seller.toString(), r.id, 'Thanks for the feedback!');
    expect(replied.seller_reply).toBe('Thanks for the feedback!');

    await expect(
      productReviewService.create(userA.toString(), { product_id: productId.toString(), rating: 9 })
    ).rejects.toThrow(/1 and 5/i);
  });
});
