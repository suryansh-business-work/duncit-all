import { GraphQLError } from 'graphql';
import { escapeRegExp } from '@utils/regex';
import { LEAD_NAME_FIELDS } from '@modules/crm/crm/leadModels';
import { leadModel, type StoredLead } from './leadQuality.lead';
import { QUALITY_LEAD_TYPES, type QualityLeadType } from './leadQuality.rules';

/**
 * One search across all five CRM lead collections, filtered and sorted on the
 * Lead Quality Score summary each lead carries — "every lead below 60", "the
 * best venue leads in Lucknow", "host leads still pending verification".
 * Read-only. Each collection answers through its quality index; the pages are
 * merged here.
 */

export const SEARCH_SORTS = ['SCORE_DESC', 'SCORE_ASC', 'NEWEST'] as const;
export type SearchSort = (typeof SEARCH_SORTS)[number];

export interface CrmLeadSearchInput {
  entity_types?: readonly QualityLeadType[] | null;
  search?: string | null;
  city?: string | null;
  min_score?: number | null;
  max_score?: number | null;
  classification?: string | null;
  qualification?: string | null;
  verification?: string | null;
  has_failed_gates?: boolean | null;
  unscored?: boolean | null;
  sort?: SearchSort | null;
  page?: number | null;
  page_size?: number | null;
}

const LIMITS = { pageSize: 100, page: 50, search: 100 } as const;
const FIELDS = 'city area lead_status instagram_link website contacts.mobile_number contacts.email quality created_at';

const SORTS: Record<SearchSort, Record<string, 1 | -1>> = {
  SCORE_DESC: { 'quality.score': -1, _id: 1 },
  SCORE_ASC: { 'quality.score': 1, _id: 1 },
  NEWEST: { created_at: -1, _id: 1 },
};

function rangeFilter(min?: number | null, max?: number | null): Record<string, number> | null {
  const range: Record<string, number> = {};
  if (typeof min === 'number') range.$gte = min;
  if (typeof max === 'number') range.$lte = max;
  return Object.keys(range).length > 0 ? range : null;
}

/** The Mongo filter for one collection. */
export function searchFilter(entity_type: QualityLeadType, input: CrmLeadSearchInput): Record<string, unknown> {
  const filter: Record<string, unknown> = {};
  const search = (input.search ?? '').trim().slice(0, LIMITS.search);
  if (search) {
    const rx = new RegExp(escapeRegExp(search), 'i');
    filter.$or = [{ [LEAD_NAME_FIELDS[entity_type]]: rx }, { city: rx }, { 'contacts.mobile_number': rx }, { 'contacts.email': rx }, { instagram_link: rx }];
  }
  if (input.city?.trim()) filter.city = new RegExp(`^${escapeRegExp(input.city.trim())}$`, 'i');
  if (input.unscored) {
    filter.quality = { $exists: false };
    return filter;
  }
  const score = rangeFilter(input.min_score, input.max_score);
  if (score) filter['quality.score'] = score;
  if (input.classification) filter['quality.classification'] = input.classification;
  if (input.qualification) filter['quality.qualification'] = input.qualification;
  if (input.verification) filter['quality.verification'] = input.verification;
  if (input.has_failed_gates === true) filter['quality.failed_gates'] = { $gt: 0 };
  if (input.has_failed_gates === false) filter['quality.failed_gates'] = 0;
  return filter;
}

interface QualitySummary {
  score?: number;
  [key: string]: unknown;
}

function toRow(entity_type: QualityLeadType, doc: StoredLead) {
  const contacts = doc.contacts ?? [];
  const quality = (doc.quality as QualitySummary | undefined) ?? null;
  return {
    entity_type,
    id: String(doc._id),
    name: String(doc[LEAD_NAME_FIELDS[entity_type]] ?? ''),
    city: String(doc.city ?? ''),
    area: String(doc.area ?? ''),
    lead_status: String(doc.lead_status ?? ''),
    instagram_link: String(doc.instagram_link ?? ''),
    website: String(doc.website ?? ''),
    phones: contacts.map((c) => c?.mobile_number ?? '').filter(Boolean),
    emails: contacts.map((c) => c?.email ?? '').filter(Boolean),
    quality: quality ? { ...quality, scored_at: quality.scored_at instanceof Date ? quality.scored_at.toISOString() : null } : null,
    created_at: doc.created_at instanceof Date ? doc.created_at.toISOString() : null,
  };
}

type Row = ReturnType<typeof toRow>;

function compare(sort: SearchSort) {
  return (a: Row, b: Row): number => {
    if (sort === 'NEWEST') return String(b.created_at ?? '').localeCompare(String(a.created_at ?? ''));
    const sa = typeof a.quality?.score === 'number' ? a.quality.score : -1;
    const sb = typeof b.quality?.score === 'number' ? b.quality.score : -1;
    return sort === 'SCORE_DESC' ? sb - sa : sa - sb;
  };
}

export async function searchCrmLeads(input: CrmLeadSearchInput) {
  const types = input.entity_types?.length ? [...new Set(input.entity_types)] : [...QUALITY_LEAD_TYPES];
  if (types.some((t) => !QUALITY_LEAD_TYPES.includes(t))) throw new GraphQLError('Unknown lead type.', { extensions: { code: 'BAD_USER_INPUT' } });
  const pageSize = Math.min(Math.max(input.page_size ?? 25, 1), LIMITS.pageSize);
  const page = Math.min(Math.max(input.page ?? 1, 1), LIMITS.page);
  const sort = input.sort ?? 'SCORE_DESC';
  const perType = await Promise.all(
    types.map(async (entity_type) => {
      const model = leadModel(entity_type);
      const filter = searchFilter(entity_type, input);
      const projection = `${LEAD_NAME_FIELDS[entity_type]} ${FIELDS}`;
      const [total, docs] = await Promise.all([model.countDocuments(filter), model.find(filter, projection).sort(SORTS[sort]).limit(page * pageSize).lean()]);
      return { total, rows: docs.map((doc) => toRow(entity_type, doc)) };
    })
  );
  const rows = perType.flatMap((p) => p.rows).sort(compare(sort));
  return {
    rows: rows.slice((page - 1) * pageSize, page * pageSize),
    total: perType.reduce((sum, p) => sum + p.total, 0),
    page,
    page_size: pageSize,
  };
}
