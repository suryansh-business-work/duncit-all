import { GraphQLError } from 'graphql';
import { VenueLeadModel, HostLeadModel } from '@modules/crm/crm/crm.model';
import { surveyService } from './survey.service';
import { SurveyModel } from './survey.model';

export type LeadSurveyEntity = 'VENUE_LEAD' | 'HOST_LEAD';

const iso = (v: any) => (v instanceof Date ? v.toISOString() : v ?? null);
// Returned as `any` — the two lead models have structurally different docs, so
// their method signatures don't unify into a callable union otherwise.
const modelFor = (entity: LeadSurveyEntity): any => (entity === 'HOST_LEAD' ? HostLeadModel : VenueLeadModel);
const kindFor = (entity: LeadSurveyEntity) => (entity === 'HOST_LEAD' ? 'HOST' : 'VENUE');

const pubLeadResponse = (r: any) => {
  if (!r) return null;
  return {
    survey_id: r.survey_id ? String(r.survey_id) : null,
    answers: (r.answers ?? []).map((a: any) => ({ qid: a.qid, value: a.value ?? null, values: a.values ?? [] })),
    submitted_at: iso(r.submitted_at),
    submitted_by: r.submitted_by ?? null,
  };
};

export const leadSurveyService = {
  /**
   * For a venue/host lead: resolve the onboarding survey matching the lead's
   * taxonomy (super + first category + first sub) and return it alongside any
   * previously saved response. `survey` is null when nothing matches.
   */
  async forLead(entity: LeadSurveyEntity, leadId: string) {
    const lead: any = await modelFor(entity).findById(leadId).lean();
    if (!lead) throw new GraphQLError('Lead not found', { extensions: { code: 'NOT_FOUND' } });
    const survey = await surveyService.activeFor({
      kind: kindFor(entity) as 'VENUE' | 'HOST',
      super_category_id: lead.super_category_id ? String(lead.super_category_id) : null,
      category_id: lead.category_ids?.[0] ? String(lead.category_ids[0]) : null,
      sub_category_id: lead.sub_category_ids?.[0] ? String(lead.sub_category_ids[0]) : null,
    });
    return { survey, response: pubLeadResponse(lead.survey_response) };
  },

  /** Persist a filled survey response onto the specific lead. */
  async save(
    entity: LeadSurveyEntity,
    leadId: string,
    surveyId: string,
    answers: { qid: string; value?: string | null; values?: string[] | null }[],
    by?: string | null
  ) {
    const survey = await SurveyModel.findById(surveyId).select('_id').lean();
    if (!survey) throw new GraphQLError('Survey not found', { extensions: { code: 'NOT_FOUND' } });
    const clean = (answers ?? []).map((a) => ({ qid: a.qid, value: a.value ?? null, values: a.values ?? [] }));
    const survey_response = { survey_id: (survey as any)._id, answers: clean, submitted_at: new Date(), submitted_by: by ?? null };
    const lead = await modelFor(entity).findByIdAndUpdate(leadId, { $set: { survey_response } }, { new: true }).lean();
    if (!lead) throw new GraphQLError('Lead not found', { extensions: { code: 'NOT_FOUND' } });
    return pubLeadResponse((lead as any).survey_response);
  },
};
