import { LEAD_NAME_FIELDS } from '@modules/crm/crm/leadModels';
import { WON_LEAD_STATUS } from '@modules/crm/crm/crm.constants';
import { LeadCandidateModel } from '@modules/crm/leadResearch/leadResearch.model';
import { leadModel } from './leadQuality.lead';
import { LeadQualityModel } from './leadQuality.model';
import { QUALITY_LEAD_TYPES, type QualityLeadType } from './leadQuality.rules';

/**
 * CRM › Lead Quality analytics, worked out from the scores actually stored on
 * leads and their evidence records — nothing estimated. One $facet pass per
 * lead collection, one per supporting collection, merged here.
 */

const BUCKETS = [0, 20, 40, 60, 80, 100.0001];
const BUCKET_LABELS = ['0-19', '20-39', '40-59', '60-79', '80-100'];
const TOP = 10;
const TREND_WEEKS = 12;
const DAY_MS = 86_400_000;

const scored = { 'quality.score': { $exists: true } };
const countIf = (condition: unknown) => ({ $sum: { $cond: [condition, 1, 0] } });
const round = (value: number | null | undefined) => (typeof value === 'number' ? Math.round(value * 100) / 100 : null);

interface Totals {
  total: number;
  scored: number;
  average_score: number | null;
  qualified: number;
  not_qualified: number;
  pending_verification: number;
  failed_gate_leads: number;
  pending_items: number;
}

interface Facets {
  totals: Totals[];
  classifications: Array<{ _id: string; label: string; count: number }>;
  distribution: Array<{ _id: number; count: number }>;
  cities: Array<{ _id: string; leads: number; score_sum: number; qualified: number }>;
  trend: Array<{ _id: { year: number; week: number }; leads: number; score_sum: number }>;
  conversion: Array<{ _id: string; label: string; leads: number; won: number }>;
  top: Array<{ _id: unknown; name: string; city: string; quality: { score: number; classification_label: string; qualification: string } }>;
}

function pipeline(entity_type: QualityLeadType, since: Date): Record<string, unknown>[] {
  return [
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              scored: countIf({ $ne: [{ $type: '$quality.score' }, 'missing'] }),
              average_score: { $avg: '$quality.score' },
              qualified: countIf({ $eq: ['$quality.qualification', 'QUALIFIED'] }),
              not_qualified: countIf({ $eq: ['$quality.qualification', 'NOT_QUALIFIED'] }),
              pending_verification: countIf({ $eq: ['$quality.qualification', 'PENDING_VERIFICATION'] }),
              failed_gate_leads: countIf({ $gt: ['$quality.failed_gates', 0] }),
              pending_items: { $sum: { $ifNull: ['$quality.pending_items', 0] } },
            },
          },
        ],
        classifications: [
          { $match: scored },
          { $group: { _id: '$quality.classification', label: { $first: '$quality.classification_label' }, count: { $sum: 1 } } },
        ],
        distribution: [{ $match: scored }, { $bucket: { groupBy: '$quality.score', boundaries: BUCKETS, default: -1, output: { count: { $sum: 1 } } } }],
        cities: [
          { $match: { ...scored, city: { $nin: ['', null] } } },
          { $group: { _id: '$city', leads: { $sum: 1 }, score_sum: { $sum: '$quality.score' }, qualified: countIf({ $eq: ['$quality.qualification', 'QUALIFIED'] }) } },
        ],
        trend: [
          { $match: { ...scored, created_at: { $gte: since } } },
          { $group: { _id: { year: { $isoWeekYear: '$created_at' }, week: { $isoWeek: '$created_at' } }, leads: { $sum: 1 }, score_sum: { $sum: '$quality.score' } } },
        ],
        conversion: [
          { $match: scored },
          {
            $group: {
              _id: '$quality.classification',
              label: { $first: '$quality.classification_label' },
              leads: { $sum: 1 },
              won: countIf({ $eq: ['$lead_status', WON_LEAD_STATUS] }),
            },
          },
        ],
        top: [
          { $match: scored },
          { $sort: { 'quality.score': -1, _id: 1 } },
          { $limit: TOP },
          { $project: { name: `$${LEAD_NAME_FIELDS[entity_type]}`, city: 1, quality: 1 } },
        ],
      },
    },
  ];
}

const emptyTotals = (): Totals => ({ total: 0, scored: 0, average_score: null, qualified: 0, not_qualified: 0, pending_verification: 0, failed_gate_leads: 0, pending_items: 0 });

function byType(entity_type: QualityLeadType, facets: Facets) {
  const totals = facets.totals[0] ?? emptyTotals();
  return {
    entity_type,
    ...totals,
    average_score: round(totals.average_score),
    classifications: facets.classifications.map((c) => ({ key: c._id ?? '', label: c.label ?? '', count: c.count })),
    distribution: BUCKET_LABELS.map((label, index) => ({
      key: label,
      label,
      count: facets.distribution.find((d) => d._id === BUCKETS[index])?.count ?? 0,
    })),
  };
}

/** Merge rows from several lead types that share a key (a city, a week, a classification). */
function mergeBy<T extends { _id: unknown }>(rows: T[], keyOf: (row: T) => string, add: (into: T, row: T) => void): T[] {
  const merged = new Map<string, T>();
  for (const row of rows) {
    const key = keyOf(row);
    const current = merged.get(key);
    if (current) add(current, row);
    else merged.set(key, { ...row });
  }
  return [...merged.values()];
}

async function supporting(types: readonly QualityLeadType[]) {
  const match = { entity_type: { $in: types } };
  const [origins, missing, duplicates, candidates] = await Promise.all([
    LeadQualityModel.aggregate<{ _id: string; leads: number; average_score: number | null; qualified: number }>([
      { $match: { ...match, score: { $ne: null } } },
      { $group: { _id: '$origin', leads: { $sum: 1 }, average_score: { $avg: '$score' }, qualified: countIf({ $eq: ['$result.qualification', 'QUALIFIED'] }) } },
    ]),
    LeadQualityModel.aggregate<{ _id: { entity_type: string; criterion: string }; leads: number }>([
      { $match: match },
      { $unwind: '$result.criteria' },
      { $match: { 'result.criteria.status': { $in: ['PENDING', 'PARTIAL'] } } },
      { $group: { _id: { entity_type: '$entity_type', criterion: '$result.criteria.name' }, leads: { $sum: 1 } } },
      { $sort: { leads: -1 } },
      { $limit: TOP },
    ]),
    LeadQualityModel.aggregate<{ leads: number }>([
      { $match: match },
      { $unwind: '$result.criteria' },
      { $unwind: '$result.criteria.items' },
      { $match: { 'result.criteria.items.auto_check': 'CRM_UNIQUENESS', 'result.criteria.items.status': 'FAILED' } },
      { $group: { _id: { entity_type: '$entity_type', lead_id: '$lead_id' } } },
      { $count: 'leads' },
    ]),
    LeadCandidateModel.aggregate<{ _id: string; count: number; average_score: number | null }>([
      { $match: { lead_type: { $in: types } } },
      { $group: { _id: '$status', count: { $sum: 1 }, average_score: { $avg: '$score' } } },
    ]),
  ]);
  return {
    origins: origins.map((o) => ({ origin: o._id ?? 'MANUAL', leads: o.leads, average_score: round(o.average_score), qualified: o.qualified })),
    missing_evidence: missing.map((m) => ({ entity_type: m._id.entity_type, criterion: m._id.criterion, leads: m.leads })),
    duplicate_leads: duplicates[0]?.leads ?? 0,
    research_queue: candidates.map((c) => ({ key: c._id, label: c._id, count: c.count, average_score: round(c.average_score) })),
  };
}

export async function leadQualityAnalytics(entity_type?: QualityLeadType | null, now = new Date()) {
  const types = entity_type ? [entity_type] : [...QUALITY_LEAD_TYPES];
  const since = new Date(now.getTime() - TREND_WEEKS * 7 * DAY_MS);
  const facets = await Promise.all(
    types.map(async (type) => ({ type, facets: (await leadModel(type).aggregate<Facets>(pipeline(type, since)))[0] }))
  );
  const all = facets.filter((f): f is { type: QualityLeadType; facets: Facets } => Boolean(f.facets));
  const cities = mergeBy(all.flatMap((f) => f.facets.cities), (c) => c._id, (into, row) => {
    into.leads += row.leads;
    into.score_sum += row.score_sum;
    into.qualified += row.qualified;
  });
  const trend = mergeBy(all.flatMap((f) => f.facets.trend), (t) => `${t._id.year}-${t._id.week}`, (into, row) => {
    into.leads += row.leads;
    into.score_sum += row.score_sum;
  });
  const conversion = mergeBy(all.flatMap((f) => f.facets.conversion), (c) => c._id ?? '', (into, row) => {
    into.leads += row.leads;
    into.won += row.won;
  });
  return {
    by_type: all.map((f) => byType(f.type, f.facets)),
    top_leads: all
      .flatMap((f) => f.facets.top.map((t) => ({ entity_type: f.type, id: String(t._id), name: t.name ?? '', city: t.city ?? '', score: t.quality.score, classification_label: t.quality.classification_label ?? '', qualification: t.quality.qualification ?? '' })))
      .sort((a, b) => b.score - a.score)
      .slice(0, TOP),
    cities: cities
      .map((c) => ({ city: c._id, leads: c.leads, average_score: round(c.score_sum / c.leads), qualified: c.qualified }))
      .sort((a, b) => b.leads - a.leads)
      .slice(0, TOP),
    trend: trend
      .map((t) => ({ week: `${t._id.year}-W${String(t._id.week).padStart(2, '0')}`, leads: t.leads, average_score: round(t.score_sum / t.leads) }))
      .sort((a, b) => a.week.localeCompare(b.week)),
    conversion: conversion.map((c) => ({ classification: c._id ?? '', label: c.label ?? '', leads: c.leads, won: c.won, conversion_rate: round((c.won / c.leads) * 100) })),
    ...(await supporting(types)),
    generated_at: now.toISOString(),
  };
}
