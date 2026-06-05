import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { WebsitePageModel } from './websitePage.model';
import { VenueLeadModel, HostLeadModel } from '@modules/crm/crm/crm.model';
import { discoverUrls, extractContent, fetchText, normaliseSite } from './websitePage.scrape';

export type WebsiteEntity = 'VENUE_LEAD' | 'HOST_LEAD';

const iso = (v: any) => (v instanceof Date ? v.toISOString() : v ?? null);
const oid = (v: string) => new Types.ObjectId(v);

const pub = (doc: any) => {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    id: String(o._id),
    entity_type: o.entity_type,
    lead_id: String(o.lead_id),
    url: o.url,
    title: o.title ?? null,
    status: o.status ?? 'DISCOVERED',
    http_status: o.http_status ?? null,
    content_text: o.content_text ?? null,
    content_chars: o.content_chars ?? 0,
    error: o.error ?? null,
    fetched_at: iso(o.fetched_at),
    created_at: iso(o.created_at),
    updated_at: iso(o.updated_at),
  };
};

const badInput = (msg: string) => new GraphQLError(msg, { extensions: { code: 'BAD_USER_INPUT' } });

/** Read the `website` field off the owning lead (Venue or Host). */
async function leadWebsite(entity: WebsiteEntity, leadId: string): Promise<string | null> {
  const Model: any = entity === 'HOST_LEAD' ? HostLeadModel : VenueLeadModel;
  const lead: any = await Model.findById(leadId).select('website').lean();
  if (!lead) throw new GraphQLError('Lead not found', { extensions: { code: 'NOT_FOUND' } });
  return lead.website ?? null;
}

export const websitePageService = {
  async list(entity: WebsiteEntity, leadId: string) {
    const docs = await WebsitePageModel.find({ entity_type: entity, lead_id: oid(leadId) }).sort({
      created_at: 1,
    });
    return docs.map(pub);
  },

  /**
   * Discover up to `limit` pages from the lead's website and upsert them as
   * DISCOVERED rows (existing pages keep their fetched content). Returns the
   * full, refreshed page list plus discovery counts.
   */
  async scrape(entity: WebsiteEntity, leadId: string, limit: number) {
    const max = Math.min(Math.max(Number(limit) || 0, 1), 200);
    const site = normaliseSite(await leadWebsite(entity, leadId));
    if (!site) throw badInput('This lead has no website on record. Add one via Edit first.');

    const urls = await discoverUrls(site, max);
    if (urls.length === 0) throw badInput('Could not discover any pages for this website.');

    let saved = 0;
    for (const url of urls) {
      const r = await WebsitePageModel.updateOne(
        { entity_type: entity, lead_id: oid(leadId), url },
        { $setOnInsert: { status: 'DISCOVERED' } },
        { upsert: true }
      );
      if (r.upsertedCount) saved += 1;
    }
    return { discovered: urls.length, saved, pages: await this.list(entity, leadId) };
  },

  /** Fetch + extract readable content for one discovered page. */
  async fetchContent(id: string) {
    const doc = await WebsitePageModel.findById(id);
    if (!doc) throw new GraphQLError('Page not found', { extensions: { code: 'NOT_FOUND' } });
    try {
      const { status, body } = await fetchText(doc.url);
      doc.http_status = status;
      if (status >= 400) {
        doc.status = 'ERROR';
        doc.error = `HTTP ${status}`;
      } else {
        const { title, text } = extractContent(body);
        doc.title = title;
        doc.content_text = text;
        doc.content_chars = text.length;
        doc.status = 'FETCHED';
        doc.error = null;
      }
    } catch (err: any) {
      doc.status = 'ERROR';
      doc.error = err?.name === 'AbortError' ? 'Request timed out' : String(err?.message ?? err);
    }
    doc.fetched_at = new Date();
    await doc.save();
    return pub(doc);
  },

  async remove(id: string) {
    const doc = await WebsitePageModel.findByIdAndDelete(id);
    if (!doc) throw new GraphQLError('Page not found', { extensions: { code: 'NOT_FOUND' } });
    return true;
  },
};
