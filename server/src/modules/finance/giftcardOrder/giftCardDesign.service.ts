import { GraphQLError } from 'graphql';
import { Types, type ClientSession } from 'mongoose';
import { GiftCardDesignModel, type IGiftCardDesign } from './giftCardDesign.model';
import { GiftCardActivityModel, type GiftCardActivityAction } from './giftCardActivity.model';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { withTransaction } from '@utils/mongoTransaction';

/**
 * The Loyalty gift card catalogue. Members see exactly one design — the
 * default — so the rules that keep "exactly one" true live here:
 *  - the first design ever created becomes the default;
 *  - the default cannot be switched off (make another the default first);
 *  - swapping the default is one transaction, backed by a partial unique index.
 */

const DUPLICATE_KEY = 11000;

const badInput = (message: string, field?: string): never => {
  throw new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT', ...(field ? { field } : {}) } });
};

const notFound = (): never => {
  throw new GraphQLError('Gift card design not found', { extensions: { code: 'NOT_FOUND' } });
};

/** Uploaded artwork only — a design must point at a real https image. */
const HTTPS_URL = /^https:\/\/[^\s]+$/i;

export const MAX_STOCK_ADJUSTMENT = 100_000;

export interface GiftCardDesignInput {
  name?: string | null;
  category?: string | null;
  front_image_url?: string | null;
  back_image_url?: string | null;
  is_active?: boolean | null;
  sort_order?: number | null;
}

const DESIGN_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['name', 'category'],
  sortFields: {
    name: 'name',
    category: 'category',
    physical_stock: 'physical_stock',
    sort_order: 'sort_order',
    is_default: 'is_default',
    is_active: 'is_active',
    created_at: 'created_at',
    updated_at: 'updated_at',
  },
  filterFields: {
    name: { type: 'string' },
    category: { type: 'string' },
    is_default: { type: 'boolean' },
    is_active: { type: 'boolean' },
    physical_stock: { type: 'number' },
    created_at: { type: 'date' },
  },
  defaultSort: { is_default: -1, sort_order: 1, created_at: -1 },
};

export const designPub = (d: IGiftCardDesign) => ({
  id: String(d._id),
  name: d.name,
  category: d.category ?? '',
  front_image_url: d.front_image_url,
  back_image_url: d.back_image_url,
  is_default: !!d.is_default,
  is_active: !!d.is_active,
  physical_stock: d.physical_stock ?? 0,
  sort_order: d.sort_order ?? 0,
  created_at: d.created_at?.toISOString?.() ?? '',
  updated_at: d.updated_at?.toISOString?.() ?? '',
});

/** Write one audit row. Exported for the order side, which shares the trail. */
export async function recordDesignActivity(
  designId: Types.ObjectId,
  action: GiftCardActivityAction,
  actorId: string | null,
  note: string,
  session?: ClientSession
): Promise<void> {
  await GiftCardActivityModel.create(
    [
      {
        entity_type: 'DESIGN',
        entity_id: designId,
        action,
        actor_user_id: actorId && Types.ObjectId.isValid(actorId) ? new Types.ObjectId(actorId) : null,
        note: note.slice(0, 500),
      },
    ],
    { session }
  );
}

function cleanText(value: string | null | undefined, max: number): string {
  return (value ?? '').trim().slice(0, max);
}

function assertImage(url: string, field: string) {
  if (!HTTPS_URL.test(url)) badInput('Upload an image for this side of the card', field);
}

async function findDesign(id: string): Promise<IGiftCardDesign> {
  if (!Types.ObjectId.isValid(id)) badInput('Choose a gift card design');
  return (await GiftCardDesignModel.findById(id)) ?? notFound();
}

/** Human summary of what an update changed, for the audit row. */
function changedFields(input: GiftCardDesignInput): string {
  const keys = Object.entries(input)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k]) => k);
  return keys.length > 0 ? `Changed ${keys.join(', ')}` : 'No changes';
}

export const giftCardDesignService = {
  async table(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<IGiftCardDesign>(
      GiftCardDesignModel,
      {},
      input,
      DESIGN_TABLE_CONFIG
    );
    return { rows: docs.map(designPub), total, page, page_size };
  },

  async byId(id: string) {
    return designPub(await findDesign(id));
  },

  /** Distinct categories in use, for the console's category picker. */
  async categories(): Promise<string[]> {
    const values: string[] = await GiftCardDesignModel.distinct('category', { category: { $ne: '' } });
    return values.sort((a, b) => a.localeCompare(b));
  },

  /** The one design members buy. Null until the Loyalty team uploads one. */
  defaultDesign(): Promise<IGiftCardDesign | null> {
    return GiftCardDesignModel.findOne({ is_default: true, is_active: true }).exec();
  },

  async create(input: GiftCardDesignInput, actorId: string) {
    const name = cleanText(input.name, 120);
    if (!name) badInput('Give the design a name', 'name');
    const front = cleanText(input.front_image_url, 2048);
    const back = cleanText(input.back_image_url, 2048);
    assertImage(front, 'front_image_url');
    assertImage(back, 'back_image_url');
    const hasDefault = await GiftCardDesignModel.exists({ is_default: true });
    const doc = await GiftCardDesignModel.create({
      name,
      category: cleanText(input.category, 80),
      front_image_url: front,
      back_image_url: back,
      is_active: true,
      // The catalogue is never left without a card to sell.
      is_default: !hasDefault,
      physical_stock: 0,
      sort_order: Math.floor(Number(input.sort_order) || 0),
    });
    await recordDesignActivity(doc._id, 'DESIGN_CREATED', actorId, name);
    return designPub(doc);
  },

  async update(id: string, input: GiftCardDesignInput, actorId: string) {
    const doc = await findDesign(id);
    if (input.name != null) {
      const name = cleanText(input.name, 120);
      if (!name) badInput('Give the design a name', 'name');
      doc.name = name;
    }
    if (input.category != null) doc.category = cleanText(input.category, 80);
    if (input.front_image_url != null) {
      doc.front_image_url = cleanText(input.front_image_url, 2048);
      assertImage(doc.front_image_url, 'front_image_url');
    }
    if (input.back_image_url != null) {
      doc.back_image_url = cleanText(input.back_image_url, 2048);
      assertImage(doc.back_image_url, 'back_image_url');
    }
    if (input.is_active != null) {
      if (!input.is_active && doc.is_default) {
        badInput('Make another design the default before switching this one off', 'is_active');
      }
      doc.is_active = input.is_active;
    }
    if (input.sort_order != null) doc.sort_order = Math.floor(Number(input.sort_order) || 0);
    await doc.save();
    await recordDesignActivity(doc._id, 'DESIGN_UPDATED', actorId, changedFields(input));
    return designPub(doc);
  },

  /** Swap the default in one transaction. An inactive design is switched on with it. */
  async setDefault(id: string, actorId: string) {
    const doc = await findDesign(id);
    if (doc.is_default) return designPub(doc);
    try {
      await withTransaction(async (session) => {
        await GiftCardDesignModel.updateMany(
          { is_default: true },
          { $set: { is_default: false } },
          { session }
        );
        await GiftCardDesignModel.updateOne(
          { _id: doc._id },
          { $set: { is_default: true, is_active: true } },
          { session }
        );
        await recordDesignActivity(doc._id, 'DESIGN_DEFAULT_SET', actorId, doc.name, session);
      });
    } catch (e) {
      if ((e as { code?: number })?.code === DUPLICATE_KEY) {
        throw new GraphQLError('Someone else changed the default just now — reload and try again', {
          extensions: { code: 'CONFLICT' },
        });
      }
      throw e;
    }
    return designPub(await findDesign(id));
  },

  /**
   * Correct the printed-card count: +N after a print run, −N for damaged cards.
   * One guarded update, so stock can never go below zero, and the reason is
   * kept beside who changed it.
   */
  async adjustStock(id: string, delta: number, reason: string, actorId: string) {
    const change = Math.trunc(Number(delta));
    if (!Number.isFinite(change) || change === 0) badInput('Enter how many cards to add or remove', 'delta');
    if (Math.abs(change) > MAX_STOCK_ADJUSTMENT) {
      badInput(`Adjust by at most ${MAX_STOCK_ADJUSTMENT} cards at a time`, 'delta');
    }
    const why = cleanText(reason, 300);
    if (!why) badInput('Say why the stock is changing', 'reason');
    const doc = await findDesign(id);
    const updated = await GiftCardDesignModel.findOneAndUpdate(
      { _id: doc._id, physical_stock: { $gte: Math.max(0, -change) } },
      { $inc: { physical_stock: change } },
      { new: true }
    );
    if (!updated) badInput(`Only ${doc.physical_stock} cards are in stock`, 'delta');
    const signed = change > 0 ? `+${change}` : String(change);
    await recordDesignActivity(doc._id, 'STOCK_ADJUSTED', actorId, `${signed} (${why})`);
    return designPub(updated!);
  },

  async syncIndexes(): Promise<void> {
    await GiftCardDesignModel.syncIndexes();
  },
};
