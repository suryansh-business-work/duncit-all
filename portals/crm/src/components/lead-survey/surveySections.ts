import { crmSplitSurveySections, type CrmSurveySection } from '@duncit/utils';
import type { LeadSurveyQuestion } from './queries';

export type SurveySection = CrmSurveySection<LeadSurveyQuestion>;

/**
 * Split a flat question list into stepper sections — one step per SECTION
 * heading (@duncit/utils crm-lead-survey, shared with the Duncit CRM app).
 */
export const splitSections = (questions: LeadSurveyQuestion[], fallbackTitle = 'Details'): SurveySection[] =>
  crmSplitSurveySections(questions, fallbackTitle);
