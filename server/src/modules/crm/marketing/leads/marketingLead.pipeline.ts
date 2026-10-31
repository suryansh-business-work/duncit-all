import { logs } from '@observability/log';
import { IgLeadModel, type IgLeadDoc } from '../igLeads/igLead.model';
import { MarketingLeadModel } from './marketingLead.model';
import { emailKey, isPhone } from './marketingLead.keys';
import { leadActor, upsertLead } from './marketingLead.service';
import { SYSTEM_LEAD_ACTOR, type LeadActor, type LeadInput } from './marketingLead.types';

/**
 * How Instagram leads reach the pipeline. A search feeds what it saved as
 * soon as it saves it; the boot migration catches up every profile saved
 * before the pipeline existed. Both go through the same upsert, keyed on the
 * handle, so a profile is one lead however many times it is seen.
 */
const LOG = 'marketing-leads';

type IgLeadRow = IgLeadDoc & { _id: unknown };

/** An Instagram profile as the pipeline takes it. Contacts the profile published that are not usable are dropped, not refused. */
export function igLeadToInput(doc: IgLeadRow): LeadInput {
  return {
    name: doc.name || `@${doc.username}`,
    pipeline: 'GENERAL',
    source: 'INSTAGRAM',
    instagram_handle: doc.username,
    website: doc.website ?? '',
    emails: (doc.emails ?? []).filter((email) => emailKey(email) !== ''),
    phones: (doc.phones ?? []).filter(isPhone),
    score: doc.fit_score ?? null,
    score_reason: doc.fit_reason ?? '',
    source_ref: { ig_lead_id: String(doc._id), search_id: doc.search_id ? String(doc.search_id) : '' },
  };
}

export interface FeedCounts {
  added: number;
  merged: number;
}

async function feed(docs: readonly IgLeadRow[], actor: LeadActor): Promise<FeedCounts> {
  const counts: FeedCounts = { added: 0, merged: 0 };
  for (const doc of docs) {
    const { merged } = await upsertLead(igLeadToInput(doc), actor);
    if (merged) counts.merged += 1;
    else counts.added += 1;
  }
  return counts;
}

/** The profiles a search just saved, as pipeline leads. Called from the search's own run. */
export async function feedIgLeadsToPipeline(usernames: readonly string[], userId: string | null): Promise<FeedCounts> {
  if (usernames.length === 0) return { added: 0, merged: 0 };
  const docs = await IgLeadModel.find({ username: { $in: usernames } }).lean<IgLeadRow[]>();
  const actor = userId ? await leadActor({ id: userId }) : SYSTEM_LEAD_ACTOR;
  return feed(docs, actor);
}

export interface MigrationCounts extends FeedCounts {
  skipped: number;
}

/**
 * Every Instagram lead that has no pipeline lead carrying its id gets one.
 * Safe to run on every boot: a profile already fed is skipped by its id, and
 * one that matched an existing lead by handle was given the id on merge.
 */
export async function migrateIgLeadsToPipeline(): Promise<MigrationCounts> {
  const counts: MigrationCounts = { added: 0, merged: 0, skipped: 0 };
  const known = new Set<string>(await MarketingLeadModel.distinct('source_ref.ig_lead_id', { 'source_ref.ig_lead_id': { $ne: '' } }));
  for await (const doc of IgLeadModel.find().lean<IgLeadRow>()) {
    if (known.has(String(doc._id))) {
      counts.skipped += 1;
      continue;
    }
    const { merged } = await upsertLead(igLeadToInput(doc), SYSTEM_LEAD_ACTOR);
    if (merged) counts.merged += 1;
    else counts.added += 1;
  }
  if (counts.added + counts.merged > 0) logs.server.info(LOG, 'migrate', { ...counts, msg: 'Instagram leads carried into the pipeline' });
  return counts;
}
