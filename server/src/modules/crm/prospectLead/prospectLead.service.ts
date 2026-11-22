import { commsService } from '@services/comms/comms.service';
import type { TableQueryInput } from '@utils/table-query';
import { leadUpdate } from '@modules/crm/leadGeo/leadGeo.place';
import type { LeadNearInput } from '@modules/crm/leadGeo/leadGeo.nearby';
import {
  leadTablePage,
  logAndAttachActivity,
  normaliseLeadInput,
  notFound,
  parseDate,
  pub,
} from '@modules/crm/crm/crm.service';
import { removeLeadMedia } from '@modules/crm/leadMedia/leadMedia.model';
import { applyAssignee } from '@modules/crm/crmUser/crmUser.service';
import { assertNoLeadDuplicates } from '@modules/crm/leadDuplicate/leadDuplicate.service';
import { leadQualityService } from '@modules/crm/leadQuality/leadQuality.service';
import { NUMERIC_FIELDS, PROSPECT_CONFIG, type ProspectKind } from './prospectLead.config';

type LeadInput = Record<string, unknown> & { next_follow_up_date?: string | null };

const capitalised = (label: string) => label.charAt(0).toUpperCase() + label.slice(1);

/** What the shared lead helpers need from a hydrated lead document. */
interface LeadDocument {
  _id: unknown;
  activity_log: unknown[];
  save(): Promise<unknown>;
}

/** Model calls are made through this shape: the two models' generic signatures differ only in their document type. */
interface LeadModel {
  findById(id: string): Promise<LeadDocument | null>;
  create(doc: Record<string, unknown>): Promise<LeadDocument>;
  findByIdAndUpdate(
    id: string,
    update: Record<string, unknown>,
    options: Record<string, unknown>
  ): Promise<LeadDocument | null>;
  findByIdAndDelete(id: string): Promise<LeadDocument | null>;
}
const modelOf = (kind: ProspectKind) => PROSPECT_CONFIG[kind].model as unknown as LeadModel;

/** Blank numeric inputs are stored as null; anything else must be a finite, non-negative number. */
function normaliseNumbers(input: LeadInput): LeadInput {
  const out: LeadInput = { ...input };
  for (const key of NUMERIC_FIELDS) {
    if (!(key in out)) continue;
    const raw = out[key];
    if (raw === null || raw === undefined || raw === '') {
      out[key] = null;
      continue;
    }
    const n = Number(raw);
    out[key] = Number.isFinite(n) && n >= 0 ? n : null;
  }
  return out;
}

function prepare(input: LeadInput): LeadInput {
  return normaliseNumbers(normaliseLeadInput(input));
}

/**
 * CRUD, table and contact actions shared by creator and community leads. Every
 * function takes the kind first; the per-kind model, name field and table
 * allowlists come from PROSPECT_CONFIG.
 */
export const prospectLeadService = {
  table(kind: ProspectKind, input?: TableQueryInput | null, near?: LeadNearInput | null) {
    return leadTablePage(kind, PROSPECT_CONFIG[kind].table, input, near);
  },

  async get(kind: ProspectKind, id: string) {
    return pub(await modelOf(kind).findById(id));
  },

  async create(kind: ProspectKind, input: LeadInput) {
    const safe = await applyAssignee(prepare(input));
    await assertNoLeadDuplicates(safe, { entity_type: kind });
    const created = await modelOf(kind).create({ ...safe, next_follow_up_date: parseDate(safe.next_follow_up_date) });
    await leadQualityService.refreshAfterSave(kind, String(created._id), 'CREATE');
    return pub(created);
  },

  async update(kind: ProspectKind, id: string, input: LeadInput) {
    const safe = await applyAssignee(prepare(input), { entity_type: kind, id });
    await assertNoLeadDuplicates(safe, { entity_type: kind, id });
    const updated = await modelOf(kind).findByIdAndUpdate(
      id,
      leadUpdate({ ...safe, next_follow_up_date: parseDate(safe.next_follow_up_date) }, input),
      { new: true, runValidators: true }
    );
    if (!updated) notFound(capitalised(PROSPECT_CONFIG[kind].label));
    await leadQualityService.refreshAfterSave(kind, id, 'UPDATE');
    return pub(updated);
  },

  async remove(kind: ProspectKind, id: string) {
    const doc = await modelOf(kind).findByIdAndDelete(id);
    if (!doc) notFound(capitalised(PROSPECT_CONFIG[kind].label));
    await removeLeadMedia(kind, id);
    await leadQualityService.removeForLead(kind, id);
    return true;
  },

  async email(
    kind: ProspectKind,
    id: string,
    message: {
      to: string;
      subject: string;
      body: string;
      providerId?: string | null;
      attachments?: { url: string; name?: string | null }[] | null;
    },
    by?: string | null
  ) {
    const lead = await modelOf(kind).findById(id);
    if (!lead) notFound(capitalised(PROSPECT_CONFIG[kind].label));
    const { to, subject, body, providerId, attachments } = message;
    const result = await commsService.sendEmail({ to, subject, body, provider_id: providerId, attachments });
    await logAndAttachActivity({ lead, type: 'EMAIL', entity_type: kind, provider_id: providerId, to, subject, body, result, by });
    return result;
  },

  async call(kind: ProspectKind, id: string, to: string, providerId?: string | null, by?: string | null) {
    const lead = await modelOf(kind).findById(id);
    if (!lead) notFound(capitalised(PROSPECT_CONFIG[kind].label));
    const result = await commsService.call({ to, provider_id: providerId });
    await logAndAttachActivity({ lead, type: 'CALL', entity_type: kind, provider_id: providerId, to, result, by });
    return result;
  },
};
