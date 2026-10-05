import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { WebsiteReelModel, type IWebsiteReel } from './websiteReel.model';
import type { WebsiteNavSite } from '../websiteNav/websiteNav.model';
import { websiteReelSettingsService } from './websiteReel.settings';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';

export interface WebsiteReelInput {
  site: WebsiteNavSite;
  title?: string;
  description?: string;
  video_url: string;
  file_size_bytes?: number;
  sort_order?: number;
  is_active?: boolean;
}

const toPub = (r: IWebsiteReel) => ({
  id: String(r._id),
  site: r.site,
  title: r.title ?? '',
  description: r.description ?? '',
  video_url: r.video_url,
  file_size_bytes: r.file_size_bytes ?? 0,
  sort_order: r.sort_order ?? 0,
  is_active: r.is_active ?? true,
  created_at: r.created_at?.toISOString?.() ?? '',
  updated_at: r.updated_at?.toISOString?.() ?? '',
});

/** Allowlists for the shared table engine (websiteReelsTable — DUNCIT TABLE CONTRACT v1). */
const WEBSITE_REEL_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['title', 'description'],
  sortFields: {
    site: 'site',
    title: 'title',
    file_size_bytes: 'file_size_bytes',
    sort_order: 'sort_order',
    is_active: 'is_active',
    created_at: 'created_at',
  },
  filterFields: {
    site: { type: 'enum' },
    title: { type: 'string' },
    description: { type: 'string' },
    sort_order: { type: 'number' },
    is_active: { type: 'boolean' },
    created_at: { type: 'date' },
  },
  defaultSort: { sort_order: 1, created_at: -1 },
};

const PUBLIC_SORT = { sort_order: 1, created_at: -1 } as const;

const fields = (input: WebsiteReelInput) => ({
  site: input.site,
  title: input.title ?? '',
  description: input.description ?? '',
  video_url: input.video_url,
  file_size_bytes: input.file_size_bytes ?? 0,
  sort_order: input.sort_order ?? 0,
  is_active: input.is_active ?? true,
});

/**
 * A site's slider holds at most `max_reels` active reels. Checked on every
 * write that would leave the reel active; the public read also caps the list,
 * so two racing writes can never put more than the cap on the page.
 */
async function assertRoomFor(site: WebsiteNavSite, excludeId?: string) {
  const { max_reels } = await websiteReelSettingsService.get();
  const filter: Record<string, unknown> = { site, is_active: true };
  if (excludeId) filter._id = { $ne: new Types.ObjectId(excludeId) };
  const active = await WebsiteReelModel.countDocuments(filter);
  if (active >= max_reels) {
    throw new GraphQLError(
      `This website already shows ${max_reels} reels, the most allowed. Hide or delete one first.`,
      { extensions: { code: 'BAD_USER_INPUT' } }
    );
  }
}

const assertId = (id: string) => {
  if (!Types.ObjectId.isValid(id)) {
    throw new GraphQLError('Invalid reel id', { extensions: { code: 'BAD_USER_INPUT' } });
  }
};

export const websiteReelService = {
  /** Public: a site's active reels in slider order, capped at the setting. */
  async publicList(site: WebsiteNavSite) {
    const { max_reels } = await websiteReelSettingsService.get();
    const docs = await WebsiteReelModel.find({ site, is_active: true })
      .sort(PUBLIC_SORT)
      .limit(max_reels)
      .exec();
    return docs.map(toPub);
  },

  /** Server-side table page (search/filter/sort/paginate) for websiteReelsTable. */
  async table(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<IWebsiteReel>(
      WebsiteReelModel,
      {},
      input,
      WEBSITE_REEL_TABLE_CONFIG
    );
    return { rows: docs.map(toPub), total, page, page_size };
  },

  async create(input: WebsiteReelInput) {
    if (input.is_active ?? true) await assertRoomFor(input.site);
    const doc = await WebsiteReelModel.create(fields(input));
    return toPub(doc);
  },

  async update(id: string, input: WebsiteReelInput) {
    assertId(id);
    if (input.is_active ?? true) await assertRoomFor(input.site, id);
    const doc = await WebsiteReelModel.findByIdAndUpdate(id, { $set: fields(input) }, { new: true });
    if (!doc) throw new GraphQLError('Reel not found', { extensions: { code: 'NOT_FOUND' } });
    return toPub(doc);
  },

  async remove(id: string) {
    assertId(id);
    const r = await WebsiteReelModel.deleteOne({ _id: new Types.ObjectId(id) });
    return r.deletedCount > 0;
  },
};
