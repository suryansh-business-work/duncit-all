import crypto from 'node:crypto';
import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { VenueLeadModel, HostLeadModel, EcommLeadModel } from '@modules/crm/crm/crm.model';
import { UserModel } from '@modules/access/user/user.model';
import { CategoryModel } from '@modules/pods/category/category.model';
import { surveyService } from './survey.service';
import { SurveyModel, SurveyResponseModel, type SurveyKind } from './survey.model';
import { LeadSurveyEntryModel, type LeadSurveyEntity } from './leadSurveyEntry.model';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';

const iso = (v: any) => (v instanceof Date ? v.toISOString() : v ?? null);
// Returned as `any` — the lead models have structurally different docs, so
// their method signatures don't unify into a callable union otherwise.
const MODEL_FOR: Record<LeadSurveyEntity, any> = {
  VENUE_LEAD: VenueLeadModel,
  HOST_LEAD: HostLeadModel,
  ECOMM_LEAD: EcommLeadModel,
};
const KIND_FOR: Record<LeadSurveyEntity, SurveyKind> = {
  VENUE_LEAD: 'VENUE',
  HOST_LEAD: 'HOST',
  ECOMM_LEAD: 'ECOMM',
};
// CLUB_ADMIN intentionally omitted — Club Admin onboarding has no CRM lead entity,
// so syncFromGate skips it (the meeting still books).
const ENTITY_FOR_KIND: Partial<Record<SurveyKind, LeadSurveyEntity>> = {
  VENUE: 'VENUE_LEAD',
  HOST: 'HOST_LEAD',
  ECOMM: 'ECOMM_LEAD',
};
const NAME_FIELD: Record<LeadSurveyEntity, string> = {
  VENUE_LEAD: 'venue_name',
  HOST_LEAD: 'host_name',
  ECOMM_LEAD: 'seller_name',
};
const modelFor = (entity: LeadSurveyEntity): any => MODEL_FOR[entity];
const kindFor = (entity: LeadSurveyEntity): SurveyKind => KIND_FOR[entity];
const cleanAnswers = (answers: { qid: string; value?: string | null; values?: string[] | null }[] = []) =>
  answers.map((a) => ({ qid: a.qid, value: a.value ?? null, values: a.values ?? [] }));

const pubEntry = (e: any) => ({
  id: String(e._id),
  survey_id: e.survey_id ? String(e.survey_id) : null,
  source: e.source,
  token: e.token ?? null,
  token_revoked: !!e.token_revoked,
  generated_by: e.generated_by ?? null,
  answers: (e.answers ?? []).map((a: any) => ({ qid: a.qid, value: a.value ?? null, values: a.values ?? [] })),
  filled: !!e.filled,
  submitted_at: iso(e.submitted_at),
  submitted_by: e.submitted_by ?? null,
  created_at: iso(e.created_at),
});

const leadName = (entity: LeadSurveyEntity, lead: any) => lead?.[NAME_FIELD[entity]] ?? '';

/** Allowlists for the shared table engine (leadSurveyEntriesTable — DUNCIT TABLE CONTRACT v1). */
const LEAD_SURVEY_ENTRY_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['generated_by', 'submitted_by'],
  sortFields: {
    source: 'source',
    filled: 'filled',
    submitted_at: 'submitted_at',
    created_at: 'created_at',
  },
  filterFields: {
    source: { type: 'enum' },
    filled: { type: 'boolean' },
    token_revoked: { type: 'boolean' },
    submitted_at: { type: 'date' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

const leadScope = (lead: any) => ({
  super_category_id: lead?.super_category_id ? String(lead.super_category_id) : null,
  category_id: lead?.category_ids?.[0] ? String(lead.category_ids[0]) : null,
  sub_category_id: lead?.sub_category_ids?.[0] ? String(lead.sub_category_ids[0]) : null,
});

export const leadSurveyService = {
  /**
   * Matched onboarding survey for a lead + the full generation/response log +
   * the lead's category / sub-category options. When the lead has multiple
   * categories/subs, the CRM asks which one a link is for; `override` resolves
   * the survey for that chosen scope (defaults to the lead's first cat/sub).
   */
  async forLead(
    entity: LeadSurveyEntity,
    leadId: string,
    override?: { category_id?: string | null; sub_category_id?: string | null }
  ) {
    const lead: any = await modelFor(entity).findById(leadId).lean();
    if (!lead) throw new GraphQLError('Lead not found', { extensions: { code: 'NOT_FOUND' } });
    const base = leadScope(lead);
    const scope = {
      super_category_id: base.super_category_id,
      category_id: override?.category_id ?? base.category_id,
      sub_category_id: override?.sub_category_id ?? base.sub_category_id,
    };
    const survey = await surveyService.activeFor({ kind: kindFor(entity), ...scope });
    const entries = await LeadSurveyEntryModel.find({ entity, lead_id: leadId }).sort({ created_at: -1 }).lean();
    return {
      survey,
      entries: entries.map(pubEntry),
      categories: await resolveCategoryRefs(lead.category_ids),
      sub_categories: await resolveCategoryRefs(lead.sub_category_ids),
    };
  },

  /**
   * Server-side table page of a lead's survey entries (leadSurveyEntriesTable).
   * SECURITY: rows are always scoped to the given entity + lead via baseFilter —
   * runTableQuery $and-merges it, so client filters can never widen the scope.
   */
  async entriesTable(entity: LeadSurveyEntity, leadId: string, input?: TableQueryInput | null) {
    const lead = await modelFor(entity).findById(leadId).select('_id').lean();
    if (!lead) throw new GraphQLError('Lead not found', { extensions: { code: 'NOT_FOUND' } });
    const { docs, total, page, page_size } = await runTableQuery(
      LeadSurveyEntryModel,
      { entity, lead_id: new Types.ObjectId(leadId) },
      input,
      LEAD_SURVEY_ENTRY_TABLE_CONFIG
    );
    return { rows: docs.map((d) => pubEntry(d)), total, page, page_size };
  },

  /** Staff filled the survey inside CRM — append a MANUAL entry. */
  async saveManual(entity: LeadSurveyEntity, leadId: string, surveyId: string, answers: any[], by?: string | null) {
    await assertSurvey(surveyId);
    const e = await LeadSurveyEntryModel.create({
      entity, lead_id: new Types.ObjectId(leadId), survey_id: new Types.ObjectId(surveyId),
      source: 'MANUAL', generated_by: by ?? null, answers: cleanAnswers(answers),
      filled: true, submitted_at: new Date(), submitted_by: by ?? null,
    });
    return pubEntry(e.toObject());
  },

  /** Generate a public share link (token) for the person to fill themselves. */
  async generateLink(entity: LeadSurveyEntity, leadId: string, surveyId: string, by?: string | null) {
    await assertSurvey(surveyId);
    const lead = await modelFor(entity).findById(leadId).select('_id').lean();
    if (!lead) throw new GraphQLError('Lead not found', { extensions: { code: 'NOT_FOUND' } });
    const e = await LeadSurveyEntryModel.create({
      entity, lead_id: new Types.ObjectId(leadId), survey_id: new Types.ObjectId(surveyId),
      source: 'LINK', token: crypto.randomUUID(), generated_by: by ?? null, filled: false,
    });
    return pubEntry(e.toObject());
  },

  async revokeLink(entryId: string) {
    const e = await LeadSurveyEntryModel.findByIdAndUpdate(entryId, { $set: { token_revoked: true } }, { new: true });
    if (!e) throw new GraphQLError('Entry not found', { extensions: { code: 'NOT_FOUND' } });
    return true;
  },

  async deleteEntry(entryId: string) {
    const e = await LeadSurveyEntryModel.findByIdAndDelete(entryId);
    if (!e) throw new GraphQLError('Entry not found', { extensions: { code: 'NOT_FOUND' } });
    return true;
  },

  /** Public read for the mWeb /s/:token page (no auth). */
  async byToken(token: string) {
    const entry = await LeadSurveyEntryModel.findOne({ token, token_revoked: { $ne: true } }).lean();
    if (!entry) throw new GraphQLError('This survey link is invalid or has been revoked', { extensions: { code: 'NOT_FOUND' } });
    const survey = await surveyService.getById(String((entry as any).survey_id));
    const lead: any = await modelFor((entry as any).entity).findById((entry as any).lead_id).lean();
    return { survey, lead_name: leadName((entry as any).entity, lead), already_filled: !!(entry as any).filled };
  },

  /** Public submit for the mWeb /s/:token page (no auth). */
  async submitByToken(token: string, answers: any[]) {
    const entry = await LeadSurveyEntryModel.findOneAndUpdate(
      { token, token_revoked: { $ne: true } },
      { $set: { answers: cleanAnswers(answers), filled: true, submitted_at: new Date(), submitted_by: 'external' } },
      { new: true }
    );
    if (!entry) throw new GraphQLError('This survey link is invalid or has been revoked', { extensions: { code: 'NOT_FOUND' } });
    return true;
  },

  /**
   * Called from meeting.requestMeeting: turn the gate user's survey submission
   * into a CRM lead. Matches an existing lead by email/phone, else creates one,
   * then upserts a single APP entry for the (lead, survey). Best-effort.
   */
  async syncFromGate(userId: string, kind: SurveyKind) {
    const user: any = await UserModel.findById(userId).lean();
    if (!user) return;
    const entity = ENTITY_FOR_KIND[kind];
    if (!entity) return; // kinds without a CRM lead entity (e.g. CLUB_ADMIN)
    const Model = modelFor(entity);
    const email = user.auth?.email || '';
    const phone = user.auth?.phone?.number || '';
    const name = [user.profile?.first_name, user.profile?.last_name].filter(Boolean).join(' ').trim() || email || 'Onboarding user';

    const response = await SurveyResponseModel.findOne({ user_id: new Types.ObjectId(userId), kind }).sort({ submitted_at: -1 }).lean();
    const survey: any = response ? await SurveyModel.findById((response as any).survey_id).lean() : null;

    let lead = await findLeadByContact(Model, email, phone);
    if (!lead) {
      const contacts = [{ name, email, mobile_number: phone, whatsapp_number: phone }];
      const base: any = {
        contacts,
        lead_source: 'App Onboarding',
        super_category_id: survey?.super_category_id ?? null,
        category_ids: survey?.category_id ? [survey.category_id] : [],
        sub_category_ids: survey?.sub_category_id ? [survey.sub_category_id] : [],
      };
      if (entity === 'HOST_LEAD') {
        lead = await Model.create({ ...base, host_name: name });
      } else if (entity === 'ECOMM_LEAD') {
        lead = await Model.create({ ...base, seller_name: name });
      } else {
        lead = await Model.create({
          ...base,
          venue_name: `${name}'s venue`,
          city: user.profile?.city || 'Not provided',
          full_address: 'Provided via app onboarding',
        });
      }
    }

    if (response) {
      await LeadSurveyEntryModel.findOneAndUpdate(
        { entity, lead_id: lead._id, survey_id: (response as any).survey_id, source: 'APP' },
        {
          $set: {
            answers: cleanAnswers((response as any).answers),
            filled: true, submitted_at: new Date(), submitted_by: userId, generated_by: userId,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
  },

  /** Live email/phone match between a lead's contacts and a Duncit user. */
  async matchedUserForLead(lead: any) {
    const emails = (lead?.contacts ?? []).map((c: any) => c.email).filter(Boolean);
    const phones = (lead?.contacts ?? [])
      .flatMap((c: any) => [c.mobile_number, c.whatsapp_number])
      .filter(Boolean);
    if (emails.length === 0 && phones.length === 0) return null;
    const or: any[] = [];
    if (emails.length) or.push({ 'auth.email': { $in: emails.map((e: string) => e.toLowerCase()) } });
    if (phones.length) or.push({ 'auth.phone.number': { $in: phones } });
    const user: any = await UserModel.findOne({ $or: or, 'metadata.deleted_at': null }).lean();
    if (!user) return null;
    const matched_on = user.auth?.email && emails.map((e: string) => e.toLowerCase()).includes(user.auth.email) ? 'EMAIL' : 'PHONE';
    return {
      user_id: String(user._id),
      full_name: [user.profile?.first_name, user.profile?.last_name].filter(Boolean).join(' ').trim(),
      email: user.auth?.email ?? null,
      phone: user.auth?.phone?.number ?? null,
      profile_photo: user.profile?.profile_photo ?? null,
      matched_on,
    };
  },
};

async function assertSurvey(surveyId: string) {
  const s = await SurveyModel.findById(surveyId).select('_id').lean();
  if (!s) throw new GraphQLError('Survey not found', { extensions: { code: 'NOT_FOUND' } });
}

/** Resolve a list of category ObjectIds to [{ id, name }], preserving order. */
async function resolveCategoryRefs(ids: any[] = []): Promise<{ id: string; name: string }[]> {
  const list = (ids ?? []).map(String).filter(Boolean);
  if (list.length === 0) return [];
  const cats = await CategoryModel.find({ _id: { $in: list } }).select('name').lean();
  const byId = new Map(cats.map((c: any) => [String(c._id), c.name as string]));
  return list.filter((id) => byId.has(id)).map((id) => ({ id, name: byId.get(id) as string }));
}

async function findLeadByContact(Model: any, email: string, phone: string) {
  const or: any[] = [];
  if (email) or.push({ 'contacts.email': email.toLowerCase() });
  if (phone) or.push({ 'contacts.mobile_number': phone }, { 'contacts.whatsapp_number': phone });
  if (or.length === 0) return null;
  return Model.findOne({ $or: or });
}
