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
    campaign: { path: 'wa_campaign_name', type: 'enum' },
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
    // `campaign` names the AiSensy campaign on BOTH halves — stored as
    // `wa_campaign_name` on a marketing send and as `campaign` here — so one
    // filter narrows the whole union. It is what the Campaigns and Templates
    // tabs hand over when a send count is clicked.
    campaign: { type: 'enum' },
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

/**
 * What one AiSensy campaign name has actually produced, across both records.
 *
 * `attempts` is carried beside `sent` because zero of forty is the answer this
 * count exists to give: a campaign nothing was ever pointed at and a campaign
 * that has rejected every message look identical if only the sent figure is
 * shown, and they are opposite problems.
 */
export interface WaSendCount {
  campaign: string;
  sent: number;
  attempts: number;
}

/** One name's running tally while the two records are merged. */
type Tally = Pick<WaSendCount, 'sent' | 'attempts'>;

/** What a `$group` on either collection hands back. Both group keys are the
 * campaign-name column of a `String` field, and a document that never had one
 * groups under `null`. */
interface TallyRow {
  _id: string | null;
  sent?: number;
  attempts?: number;
}

/** A marketing send is planned as a unit, so its own counters are the tally —
 * walking its recipients again would count the same messages a second way. */
const CAMPAIGN_TALLY: PipelineStage[] = [
  {
    $group: {
      _id: '$wa_campaign_name',
      sent: { $sum: { $ifNull: ['$sent_count', 0] } },
      attempts: { $sum: { $ifNull: ['$recipient_count', 0] } },
    },
  },
];

/** One automatic row is one message, so the tally is a count of rows. */
const AUTOMATIC_TALLY: PipelineStage[] = [
  {
    $group: {
      _id: '$campaign',
      sent: { $sum: { $cond: [{ $eq: ['$status', 'SENT'] }, 1, 0] } },
      attempts: { $sum: 1 },
    },
  },
];

/** Fold one collection's groups into the shared map. A blank name belongs to no
 * campaign — an automatic row filed under an unknown event carries none — and
 * would otherwise collect every one of them under a single unopenable row. */
function foldTallies(into: Map<string, Tally>, rows: readonly TallyRow[]): void {
  for (const row of rows) {
    const campaign = (row._id ?? '').trim();
    if (!campaign) continue;
    const running = into.get(campaign) ?? { sent: 0, attempts: 0 };
    into.set(campaign, {
      sent: running.sent + Number(row.sent ?? 0),
      attempts: running.attempts + Number(row.attempts ?? 0),
    });
  }
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

  /**
   * How many messages each AiSensy campaign has actually produced.
   *
   * The whole catalogue in one answer rather than a count per row: the console
   * shows sixty-odd campaigns and as many templates at once, and a per-row
   * query would be sixty round trips to say what two `$group`s say together.
   *
   * Keyed by CAMPAIGN NAME because that is the only name both records share and
   * the only one AiSensy knows — a template's figure is the sum of the
   * campaigns that send it, which the client already knows the mapping for from
   * the live catalogue.
   */
  async counts(): Promise<WaSendCount[]> {
    const [campaigns, automatic] = await Promise.all([
      WaCampaignModel.aggregate<TallyRow>(CAMPAIGN_TALLY),
      WaMessageLogModel.aggregate<TallyRow>(AUTOMATIC_TALLY),
    ]);
    const tallies = new Map<string, Tally>();
    foldTallies(tallies, campaigns);
    foldTallies(tallies, automatic);
    return [...tallies].map(([campaign, tally]) => ({ campaign, ...tally }));
  },
};
