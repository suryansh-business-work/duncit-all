import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { ProductReviewModel, type IProductReview } from './productReview.model';
import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import { EcommBrandModel } from '@modules/venues/ecommBrand/ecommBrand.model';
import { UserModel } from '@modules/access/user/user.model';

const oid = (v: string) => new Types.ObjectId(v);
const has = (arr: Types.ObjectId[], id: string) => (arr ?? []).some((x) => String(x) === id);
const fail = (code: string, message: string) => {
  throw new GraphQLError(message, { extensions: { code } });
};

function toPub(r: IProductReview, viewerId: string | null) {
  const up = r.up_voter_ids ?? [];
  const down = r.down_voter_ids ?? [];
  let myVote = 0;
  if (viewerId && has(up, viewerId)) myVote = 1;
  else if (viewerId && has(down, viewerId)) myVote = -1;
  return {
    id: String(r._id),
    product_id: String(r.product_id),
    user_id: String(r.user_id),
    user_name: r.user_name ?? '',
    rating: r.rating,
    comment: r.comment ?? '',
    images: Array.isArray(r.images) ? r.images : [],
    up_votes: up.length,
    down_votes: down.length,
    my_vote: myVote,
    seller_reply: r.seller_reply ?? '',
    seller_reply_at: r.seller_reply_at ? r.seller_reply_at.toISOString() : null,
    created_at: r.created_at?.toISOString?.() ?? '',
  };
}

export const productReviewService = {
  async listByProduct(productId: string, viewerId: string | null) {
    const docs = await ProductReviewModel.find({ product_id: oid(productId) }).sort({ created_at: -1 });
    return docs.map((d) => toPub(d, viewerId));
  },

  async summary(productId: string) {
    const docs = await ProductReviewModel.find({ product_id: oid(productId) }).select('rating');
    const starCounts = [0, 0, 0, 0, 0];
    let sum = 0;
    for (const d of docs) {
      const r = Math.min(5, Math.max(1, d.rating));
      starCounts[r - 1] += 1;
      sum += r;
    }
    const total = docs.length;
    return {
      product_id: productId,
      average_rating: total ? Number((sum / total).toFixed(2)) : 0,
      total,
      star_counts: starCounts,
    };
  },

  async create(userId: string, input: { product_id: string; rating: number; comment?: string | null; images?: string[] | null }) {
    const rating = Math.round(Number(input.rating));
    if (!(rating >= 1 && rating <= 5)) fail('BAD_USER_INPUT', 'Rating must be between 1 and 5');
    const user: any = await UserModel.findById(userId).select('profile.first_name profile.last_name').lean();
    const userName =
      [user?.profile?.first_name, user?.profile?.last_name].filter(Boolean).join(' ').trim() || 'Duncit user';
    const doc = await ProductReviewModel.findOneAndUpdate(
      { product_id: oid(input.product_id), user_id: oid(userId) },
      {
        $set: {
          rating,
          comment: (input.comment ?? '').trim(),
          images: Array.isArray(input.images) ? input.images.filter(Boolean) : [],
          user_name: userName,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return toPub(doc, userId);
  },

  async vote(userId: string, reviewId: string, vote: number) {
    const doc = await ProductReviewModel.findById(reviewId);
    if (!doc) fail('NOT_FOUND', 'Review not found');
    const review = doc!;
    review.up_voter_ids = (review.up_voter_ids ?? []).filter((x) => String(x) !== userId);
    review.down_voter_ids = (review.down_voter_ids ?? []).filter((x) => String(x) !== userId);
    if (vote > 0) review.up_voter_ids.push(oid(userId));
    else if (vote < 0) review.down_voter_ids.push(oid(userId));
    await review.save();
    return toPub(review, userId);
  },

  async reply(userId: string, reviewId: string, reply: string) {
    const text = (reply ?? '').trim();
    if (!text) fail('BAD_USER_INPUT', 'Reply cannot be empty');
    const doc = await ProductReviewModel.findById(reviewId);
    if (!doc) fail('NOT_FOUND', 'Review not found');
    const review = doc!;
    const product = await InventoryProductModel.findById(review.product_id).select('brand_id');
    const brand = product?.brand_id
      ? await EcommBrandModel.findById(product.brand_id).select('owner_user_id')
      : null;
    if (!brand || String((brand as any).owner_user_id) !== userId) {
      fail('FORBIDDEN', 'Only the product seller can reply to a review');
    }
    review.seller_reply = text;
    review.seller_reply_at = new Date();
    await review.save();
    return toPub(review, userId);
  },
};
