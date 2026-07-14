import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import {
  WebsiteNavItemModel,
  type IWebsiteNavItem,
  type WebsiteNavSite,
} from './websiteNav.model';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';

const toPub = (i: IWebsiteNavItem) => ({
  id: String(i._id),
  site: i.site,
  area: i.area,
  group_label: i.group_label ?? '',
  label: i.label,
  url: i.url,
  sort_order: i.sort_order ?? 0,
  is_active: i.is_active ?? true,
  created_at: i.created_at?.toISOString?.() ?? '',
  updated_at: i.updated_at?.toISOString?.() ?? '',
});

/** Allowlists for the shared table engine (websiteNavTable — DUNCIT TABLE CONTRACT v1). */
const WEBSITE_NAV_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['label', 'group_label', 'url'],
  sortFields: {
    site: 'site',
    area: 'area',
    group_label: 'group_label',
    label: 'label',
    url: 'url',
    sort_order: 'sort_order',
    is_active: 'is_active',
    created_at: 'created_at',
  },
  filterFields: {
    site: { type: 'enum' },
    area: { type: 'enum' },
    group_label: { type: 'string' },
    is_active: { type: 'boolean' },
    created_at: { type: 'date' },
  },
  defaultSort: { site: 1, area: 1, group_label: 1, sort_order: 1 },
};

export const websiteNavService = {
  async publicList(site: WebsiteNavSite) {
    const docs = await WebsiteNavItemModel.find({ site, is_active: true }).sort({
      area: 1,
      group_label: 1,
      sort_order: 1,
      label: 1,
    });
    return docs.map(toPub);
  },

  async list(site?: WebsiteNavSite | null) {
    const q: any = {};
    if (site) q.site = site;
    const docs = await WebsiteNavItemModel.find(q).sort({ site: 1, area: 1, group_label: 1, sort_order: 1 });
    return docs.map(toPub);
  },

  /** Server-side table page (search/filter/sort/paginate) for the websiteNavTable query. */
  async table(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<IWebsiteNavItem>(
      WebsiteNavItemModel,
      {},
      input,
      WEBSITE_NAV_TABLE_CONFIG
    );
    return { rows: docs.map(toPub), total, page, page_size };
  },

  async create(input: any) {
    const doc = await WebsiteNavItemModel.create({
      site: input.site,
      area: input.area,
      group_label: input.group_label ?? '',
      label: input.label,
      url: input.url,
      sort_order: input.sort_order ?? 0,
      is_active: input.is_active ?? true,
    });
    return toPub(doc);
  },

  async update(id: string, input: any) {
    if (!Types.ObjectId.isValid(id)) {
      throw new GraphQLError('Invalid nav item id', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const doc = await WebsiteNavItemModel.findByIdAndUpdate(
      id,
      {
        $set: {
          site: input.site,
          area: input.area,
          group_label: input.group_label ?? '',
          label: input.label,
          url: input.url,
          sort_order: input.sort_order ?? 0,
          is_active: input.is_active ?? true,
        },
      },
      { new: true }
    );
    if (!doc) throw new GraphQLError('Nav item not found', { extensions: { code: 'NOT_FOUND' } });
    return toPub(doc);
  },

  async remove(id: string) {
    const r = await WebsiteNavItemModel.deleteOne({ _id: new Types.ObjectId(id) });
    return r.deletedCount > 0;
  },

  /** Seed the sites' current (previously hardcoded) navigation once so the
   * Website portal starts populated. No-op when any items already exist. */
  async seedDefaults() {
    const count = await WebsiteNavItemModel.estimatedDocumentCount();
    if (count > 0) return;
    const row = (
      site: WebsiteNavSite,
      area: 'HEADER' | 'FOOTER',
      group_label: string,
      label: string,
      url: string,
      sort_order: number
    ) => ({ site, area, group_label, label, url, sort_order, is_active: true });

    await WebsiteNavItemModel.insertMany([
      // MAIN header drawer
      row('MAIN', 'HEADER', 'About', 'Our story', '/about', 0),
      row('MAIN', 'HEADER', 'About', 'Careers', '/careers', 1),
      row('MAIN', 'HEADER', 'About', 'Newsroom', '/newsroom', 2),
      row('MAIN', 'HEADER', 'Community', 'Community', '/community', 0),
      row('MAIN', 'HEADER', 'Community', 'Guidelines', '/guidelines', 1),
      row('MAIN', 'HEADER', 'Community', 'Blog', '/blog', 2),
      row('MAIN', 'HEADER', 'Safety Hub', 'Our approach', '/safety/approach', 0),
      row('MAIN', 'HEADER', 'Safety Hub', 'Dating advice', '/safety/advice', 1),
      row('MAIN', 'HEADER', 'Safety Hub', 'Tools', '/safety/tools', 2),
      row('MAIN', 'HEADER', 'Safety Hub', 'Resources', '/safety/resources', 3),
      row('MAIN', 'HEADER', 'Support', 'Help center', '/help', 0),
      row('MAIN', 'HEADER', 'Support', 'FAQ', '/faq', 1),
      row('MAIN', 'HEADER', 'Support', 'Contact', '/contact', 2),
      // MAIN footer columns
      row('MAIN', 'FOOTER', 'About', 'Our story', '/about', 0),
      row('MAIN', 'FOOTER', 'About', 'Careers', '/careers', 1),
      row('MAIN', 'FOOTER', 'About', 'Newsroom', '/newsroom', 2),
      row('MAIN', 'FOOTER', 'Community', 'Community', '/community', 0),
      row('MAIN', 'FOOTER', 'Community', 'Guidelines', '/guidelines', 1),
      row('MAIN', 'FOOTER', 'Community', 'Blog', '/blog', 2),
      row('MAIN', 'FOOTER', 'Safety Hub', 'Our approach', '/safety/approach', 0),
      row('MAIN', 'FOOTER', 'Safety Hub', 'Dating advice', '/safety/advice', 1),
      row('MAIN', 'FOOTER', 'Safety Hub', 'Tools', '/safety/tools', 2),
      row('MAIN', 'FOOTER', 'Support', 'Help center', '/help', 0),
      row('MAIN', 'FOOTER', 'Support', 'FAQ', '/faq', 1),
      row('MAIN', 'FOOTER', 'Support', 'Contact', '/contact', 2),
      // Satellite site footers — Support goes to the public help center
      row('PARTNERS', 'FOOTER', 'Duncit', 'duncit.com', 'https://duncit.com', 0),
      row('PARTNERS', 'FOOTER', 'Duncit', 'Support', 'https://duncit.com/help', 1),
      row('ADS', 'FOOTER', 'Duncit', 'duncit.com', 'https://duncit.com', 0),
      row('ADS', 'FOOTER', 'Duncit', 'Support', 'https://duncit.com/help', 1),
      row('EARNWITH', 'FOOTER', 'Duncit', 'duncit.com', 'https://duncit.com', 0),
      row('EARNWITH', 'FOOTER', 'Duncit', 'Support', 'https://duncit.com/help', 1),
    ]);
  },
};
