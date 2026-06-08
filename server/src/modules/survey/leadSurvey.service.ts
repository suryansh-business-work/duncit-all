import crypto from 'crypto';
import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { VenueLeadModel, HostLeadModel } from '@modules/crm/crm/crm.model';
import { UserModel } from '@modules/access/user/user.model';
import { surveyService } from './survey.service';
import { SurveyModel, SurveyResponseModel, type SurveyKind } from './survey.model';
import { LeadSurveyEntryModel, type LeadSurveyEntity } from './leadSurveyEntry.model';

const iso = (v: any) => (v instanceof Date ? v.toISOString() : v ?? null);
// Returned as `any` — the two lead models have structurally different docs, so
// their method signatures don't unify into a callable union otherwise.
const modelFor = (entity: LeadSurveyEntity): any => (entity === 'HOST_LEAD' ? HostLeadModel : VenueLeadModel);
const kindFor = (entity: LeadSurveyEntity): SurveyKind => (entity === 'HOST_LEAD' ? 'HOST' : 'VENUE');
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

const leadName = (entity: LeadSurveyEntity, lead: any) =>
  (entity === 'HOST_LEAD' ? lead?.host_name : lead?.venue_name) ?? '';

const leadScope = (lead: any) => ({
  super_category_id: lead?.super_category_id ? String(lead.super_category_id) : null,
  category_id: lead?.category_ids?.[0] ? String(lead.category_ids[0]) : null,
  sub_category_id: lead?.sub_category_ids?.[0] ? String(lead.sub_category_ids[0]) : null,
});

export const leadSurveyService = {
  /** Matched onboarding survey for a lead + the full generation/response log. */
  async forLead(entity: LeadSurveyEntity, leadId: string) {
    const lead: any = await modelFor(entity).findById(leadId).lean();
    if (!lead) throw new GraphQLError('Lead not found', { extensions: { code: 'NOT_FOUND' } });
    const survey = await surveyService.activeFor({ kind: kindFor(entity), ...leadScope(lead) });
    const entries = await LeadSurveyEntryModel.find({ entity, lead_id: leadId }).sort({ created_at: -1 }).lean();
    return { survey, entries: entries.map(pubEntry) };
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
    const entity: LeadSurveyEntity = kind === 'HOST' ? 'HOST_LEAD' : 'VENUE_LEAD';
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
      lead = entity === 'HOST_LEAD'
        ? await Model.create({ ...base, host_name: name })
        : await Model.create({ ...base, venue_name: `${name}'s venue`, city: user.profile?.city || 'Not provided', full_address: 'Provided via app onboarding' });
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

async function findLeadByContact(Model: any, email: string, phone: string) {
  const or: any[] = [];
  if (email) or.push({ 'contacts.email': email.toLowerCase() });
  if (phone) or.push({ 'contacts.mobile_number': phone }, { 'contacts.whatsapp_number': phone });
  if (or.length === 0) return null;
  return Model.findOne({ $or: or });
}
