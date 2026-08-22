import type { PipelineStage } from 'mongoose';
import { WaMessageLogModel } from '@modules/platform/whatsapp/waMessageLog.model';
import {
  buildTableFilter,
  type TableEntityConfig,
  type TableQueryInput,
} from '@utils/table-query';
import { WaCampaignModel } from './waCampaign.model';

/**
 * One feed for every WhatsApp message Duncit has sent, however it started.
 *
 * Two collections answer the same question — "did this go out, and if not
 * why" — so the console asks it once. A marketing send is one row per
 * CAMPAIGN, because it is planned, billed and retried as a unit; a message the
 * platform sent by itself is one row per MESSAGE, because there is no unit
 * above it. The projection below flattens both onto the same shape so a single
 * table can page, sort and filter across them, and the row's `kind` is what
 * decides which detail view opens behind it.
 */
export type WaLogKind = 'CAMPAIGN' | 'AUTOMATIC';

/** Allowlists for the campaign half. `category` is Meta's, which is what the
 * rate was read from — the same field name the automatic half filters on, so
 * one filter applies to both. */
const CAMPAIGN_CONFIG: TableEntityConfig = {
  searchFields: ['name', 'wa_campaign_name'],
  sortFields: {},
  filterFields: {
    status: { type: 'enum' },
    category: { path: 'template_category', type: 'enum' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

const AUTOMATIC_CONFIG: TableEntityConfig = {
  searchFields: ['campaign', 'event_key', 'destination', 'reason'],
  sortFields: {},
  filterFields: {
    status: { type: 'enum' },
    category: { path: 'template_category', type: 'enum' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

/** Sortable columns, as the projection names them. Every one is a real
 * projected field — a synthetic name would sort by missing. */
const SORT_FIELDS = new Set(['created_at', 'status', 'name', 'kind', 'cost', 'sent_count']);

/** What one half of the union may contain — the same stages a top-level
 * pipeline takes, minus the two that write a collection. */
type BranchStage = Exclude<PipelineStage, PipelineStage.Merge | PipelineStage.Out>;

const NUMBER = (path: string) => ({ $ifNull: [path, 0] });
const TEXT = (path: string) => ({ $ifNull: [path, ''] });

/** A campaign's cost is the rate it froze times the messages that actually went
 * out — skipped and failed people were never billed. */
const CAMPAIGN_PROJECTION = {
  _id: 0,
  id: '$campaign_id',
  kind: { $literal: 'CAMPAIGN' },
  name: TEXT('$name'),
  reference: TEXT('$wa_campaign_name'),
  target: TEXT('$audience'),
  status: '$status',
  category: TEXT('$template_category'),
  recipient_count: NUMBER('$recipient_count'),
  sent_count: NUMBER('$sent_count'),
  failed_count: NUMBER('$failed_count'),
  skipped_count: NUMBER('$skipped_count'),
  msg_rate: NUMBER('$msg_rate'),
  cost: { $multiply: [NUMBER('$msg_rate'), NUMBER('$sent_count')] },
  reason: TEXT('$error'),
  created_at: '$created_at',
};

/** One automatic message is one recipient, so its counters are 1 or 0 — which
 * keeps the Sent / Failed / Skipped columns meaningful on both kinds of row. */
const isSent = (value: unknown) => ({ $cond: [{ $eq: ['$status', 'SENT'] }, value, 0] });

const AUTOMATIC_PROJECTION = {
  _id: 0,
  id: { $toString: '$_id' },
  kind: { $literal: 'AUTOMATIC' },
  name: TEXT('$campaign'),
  reference: '$event_key',
  target: TEXT('$destination'),
  status: '$status',
  category: TEXT('$template_category'),
  recipient_count: { $literal: 1 },
  sent_count: isSent(1),
  failed_count: { $cond: [{ $eq: ['$status', 'FAILED'] }, 1, 0] },
  skipped_count: { $cond: [{ $eq: ['$status', 'SKIPPED'] }, 1, 0] },
  msg_rate: NUMBER('$msg_rate'),
  cost: isSent(NUMBER('$msg_rate')),
  reason: TEXT('$reason'),
  created_at: '$created_at',
};

/** `kind` is not a stored field on either collection — it decides which halves
 * of the union run at all, so it is read out before the allowlists see it. */
function kindFilter(input: TableQueryInput | null | undefined): WaLogKind | '' {
  const found = (input?.filters ?? []).find((f) => f.field === 'kind');
  if (!found) return '';
  const raw = found.values?.length ? found.values : [found.value ?? ''];
  const picked = raw.filter((v): v is WaLogKind => v === 'CAMPAIGN' || v === 'AUTOMATIC');
  // Asking for both kinds is the same as asking for neither — either way the
  // whole union runs, so it must not be mistaken for "campaigns only".
  return picked.length === 1 ? picked[0] : '';
}

/**
 * Sorting happens after the union, so it cannot use either collection's
 * indexes — `id` is appended as a unique tiebreaker for the same reason the
 * shared engine appends `_id`: without it a low-cardinality sort lets rows
 * shift between pages.
 */
function resolveSort(input: TableQueryInput | null | undefined): Record<string, 1 | -1> {
  const field = input?.sort_by && SORT_FIELDS.has(input.sort_by) ? input.sort_by : 'created_at';
  const dir: 1 | -1 = input?.sort_dir === 'asc' ? 1 : -1;
  return { [field]: dir, id: -1 };
}

const iso = (value: unknown) => (value instanceof Date ? value.toISOString() : null);

/** The single document `$facet` emits: one page of rows and one count. */
interface FacetResult {
  rows?: Record<string, unknown>[];
  total?: { value: number }[];
}

/** Either collection can start the pipeline, and the two Model types have no
 * common ancestor — this is the only member the union is ever called on. */
interface AggregateRoot {
  aggregate: (pipeline: PipelineStage[]) => {
    allowDiskUse: (value: boolean) => PromiseLike<FacetResult[]>;
  };
}

export const waLogService = {
  /**
   * Every send, newest first, across both records.
   *
   * The per-collection `$match` is built and applied BEFORE the projection so
   * status and date filters still hit the indexes each collection carries;
   * only the sort has to wait for the union.
   */
  async table(input?: TableQueryInput | null) {
    const page = Math.max(1, Math.trunc(input?.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Math.trunc(input?.page_size ?? 25)));
    const kind = kindFilter(input);

    const campaignStages: BranchStage[] = [
      { $match: buildTableFilter(input, CAMPAIGN_CONFIG) },
      { $project: CAMPAIGN_PROJECTION },
    ];
    const automaticStages: BranchStage[] = [
      { $match: buildTableFilter(input, AUTOMATIC_CONFIG) },
      { $project: AUTOMATIC_PROJECTION },
    ];

    // Only one side asked for: run it alone rather than unioning with a branch
    // that can only contribute nothing.
    const onlyAutomatic = kind === 'AUTOMATIC';
    const root: AggregateRoot = onlyAutomatic ? WaMessageLogModel : WaCampaignModel;
    const pipeline: PipelineStage[] = onlyAutomatic ? [...automaticStages] : [...campaignStages];
    if (kind === '') {
      pipeline.push({
        $unionWith: { coll: WaMessageLogModel.collection.name, pipeline: automaticStages },
      });
    }
    pipeline.push(
      { $sort: resolveSort(input) },
      {
        $facet: {
          rows: [{ $skip: (page - 1) * pageSize }, { $limit: pageSize }],
          total: [{ $count: 'value' }],
        },
      }
    );

    // $facet always emits exactly one document, so the destructure is safe.
    const [result] = await root.aggregate(pipeline).allowDiskUse(true);
    const rows = result?.rows ?? [];
    return {
      rows: rows.map((row) => ({ ...row, created_at: iso(row.created_at) })),
      total: Number(result?.total?.[0]?.value ?? 0),
      page,
      page_size: pageSize,
    };
  },
};
