import { MarketingLeadModel } from '../leads/marketingLead.model';
import {
  LEAD_CRM_KINDS,
  LEAD_SOURCES,
  LEAD_STAGES,
  type MarketingLeadPipeline,
  type MarketingLeadStage,
} from '../leads/marketingLead.types';
import { countsIn, dayOf, inWindow, median, percent, seriesOf, type AnalyticsWindow } from './marketingAnalytics.window';

/**
 * Marketing › Analytics › Leads & Funnel.
 *
 * Two readings of the same pipeline:
 *  - the COHORT — leads created in the window: where they came from, where
 *    they stand now, and how far up the ladder each one has ever got;
 *  - the MOVES — stage changes made in the window, read from each lead's
 *    timeline (`STAGE` entries, written "FROM → TO" or "FROM → TO: note" by
 *    marketingLead.service), with how long the lead sat in the stage it left.
 */

/** The ladder a lead climbs. LOST is a way off it, not a rung. */
export const FUNNEL_STAGES: readonly MarketingLeadStage[] = ['NEW', 'CONTACTED', 'REPLIED', 'QUALIFIED', 'CONVERTED'];

const HOUR_MS = 3_600_000;

/** One side of a STAGE entry's "FROM → TO: note" — 0 the stage left, 1 the stage entered. */
const stageSide = (text: string, side: 0 | 1) => ({
  $trim: { input: { $arrayElemAt: [{ $split: [{ $arrayElemAt: [{ $split: [text, ':'] }, 0] }, '→'] }, side] } },
});

const stageEntries = { $filter: { input: '$timeline', cond: { $eq: ['$$this.kind', 'STAGE'] } } };

const scope = (pipeline: MarketingLeadPipeline | null) => (pipeline ? { pipeline } : {});

/** Leads created in the window, by source, by current stage, and per day. */
async function cohort(window: AnalyticsWindow, pipeline: MarketingLeadPipeline | null) {
  const match = { ...scope(pipeline), created_at: inWindow(window) };
  type Row = { _id: string | null; count: number };
  const [bySource, byStage, daily] = await Promise.all([
    MarketingLeadModel.aggregate<Row>([{ $match: match }, { $group: { _id: '$source', count: { $sum: 1 } } }]),
    MarketingLeadModel.aggregate<Row>([{ $match: match }, { $group: { _id: '$stage', count: { $sum: 1 } } }]),
    MarketingLeadModel.aggregate<{ _id: string; value: number }>([
      { $match: match },
      { $group: { _id: dayOf(window, '$created_at'), value: { $sum: 1 } } },
    ]),
  ]);
  return {
    new_leads: bySource.reduce((sum, row) => sum + row.count, 0),
    by_source: countsIn(LEAD_SOURCES, bySource),
    by_stage: countsIn(LEAD_STAGES, byStage),
    daily_new: seriesOf(window, daily),
  };
}

/**
 * How far up the ladder each lead of the cohort has ever got — its stage now,
 * or any stage its timeline says it was in — and the share that went on from
 * each rung to the next. Every lead stands on the first rung; one that skipped
 * a rung still counts as having passed it.
 */
async function ladder(window: AnalyticsWindow, pipeline: MarketingLeadPipeline | null) {
  const visited = {
    $concatArrays: [
      ['$stage'],
      { $map: { input: stageEntries, as: 'entry', in: stageSide('$$entry.text', 0) } },
      { $map: { input: stageEntries, as: 'entry', in: stageSide('$$entry.text', 1) } },
    ],
  };
  const rows = await MarketingLeadModel.aggregate<{ _id: number; count: number }>([
    { $match: { ...scope(pipeline), created_at: inWindow(window) } },
    {
      $project: {
        rung: { $max: [0, { $max: { $map: { input: visited, as: 'stage', in: { $indexOfArray: [FUNNEL_STAGES, '$$stage'] } } } }] },
      },
    },
    { $group: { _id: '$rung', count: { $sum: 1 } } },
  ]);
  const reached = FUNNEL_STAGES.map((_stage, rung) => rows.filter((row) => row._id >= rung).reduce((sum, row) => sum + row.count, 0));
  return FUNNEL_STAGES.map((stage, rung) => ({
    stage,
    reached: reached[rung],
    // The first rung is the whole cohort: 100% of something, or 0% of nothing.
    conversion: percent(reached[rung], rung === 0 ? reached[0] : reached[rung - 1]),
  }));
}

/**
 * Every stage change made in the window, with how long the lead had sat in the
 * stage it left: since its previous change, or since it was created for its
 * first one.
 */
async function moves(window: AnalyticsWindow, pipeline: MarketingLeadPipeline | null) {
  const spans = {
    $reduce: {
      input: stageEntries,
      initialValue: { prev: '$created_at', out: [] },
      in: {
        prev: '$$this.at',
        out: {
          $concatArrays: [
            '$$value.out',
            [{ at: '$$this.at', from: stageSide('$$this.text', 0), to: stageSide('$$this.text', 1), ms: { $subtract: ['$$this.at', '$$value.prev'] } }],
          ],
        },
      },
    },
  };
  return MarketingLeadModel.aggregate<{ _id: { from: string | null; to: string | null }; count: number; ms: number[] }>([
    { $match: { ...scope(pipeline), timeline: { $elemMatch: { kind: 'STAGE', at: inWindow(window) } } } },
    { $project: { move: spans } },
    { $unwind: '$move.out' },
    { $match: { 'move.out.at': inWindow(window) } },
    { $group: { _id: { from: '$move.out.from', to: '$move.out.to' }, count: { $sum: 1 }, ms: { $push: '$move.out.ms' } } },
  ]);
}

type Move = Awaited<ReturnType<typeof moves>>[number];

/** Each kind of move as a share of every move out of the same stage. */
function transitions(rows: readonly Move[]) {
  // A timeline line that does not read "FROM → TO" names no stage; it still counts, under ''.
  const named = rows.map((row) => ({ from: row._id.from ?? '', to: row._id.to ?? '', count: row.count }));
  const exits = new Map<string, number>();
  for (const row of named) exits.set(row.from, (exits.get(row.from) ?? 0) + row.count);
  const order = (stage: string) => LEAD_STAGES.findIndex((known) => known === stage);
  named.sort((a, b) => order(a.from) - order(b.from) || b.count - a.count || order(a.to) - order(b.to));
  return named.map((row) => ({ ...row, share: percent(row.count, exits.get(row.from) ?? 0) }));
}

/** The median time a lead sat in each stage before it moved on, in hours; a stage nobody left is left out. */
function timeInStage(rows: readonly Move[]) {
  return LEAD_STAGES.map((stage) => {
    const spans = rows.filter((row) => row._id.from === stage).flatMap((row) => row.ms);
    return { stage, moves: spans.length, median_hours: Math.round((median(spans) / HOUR_MS) * 10) / 10 };
  }).filter((row) => row.moves > 0);
}

/** Leads handed to the CRM in the window, by the kind of record they became. */
async function promoted(window: AnalyticsWindow, pipeline: MarketingLeadPipeline | null) {
  const rows = await MarketingLeadModel.aggregate<{ _id: string | null; count: number }>([
    { $match: { ...scope(pipeline), 'crm_ref.promoted_at': inWindow(window) } },
    { $group: { _id: '$crm_ref.kind', count: { $sum: 1 } } },
  ]);
  return { promoted: rows.reduce((sum, row) => sum + row.count, 0), promoted_by_kind: countsIn(LEAD_CRM_KINDS, rows) };
}

export async function funnelAnalytics(window: AnalyticsWindow, pipeline: MarketingLeadPipeline | null = null) {
  const [leads, funnel, moved, crm] = await Promise.all([
    cohort(window, pipeline),
    ladder(window, pipeline),
    moves(window, pipeline),
    promoted(window, pipeline),
  ]);
  return {
    window: { from: window.from, to: window.to, days: window.days },
    pipeline,
    ...leads,
    funnel,
    converted: moved.filter((row) => row._id.to === 'CONVERTED').reduce((sum, row) => sum + row.count, 0),
    transitions: transitions(moved),
    time_in_stage: timeInStage(moved),
    ...crm,
  };
}
