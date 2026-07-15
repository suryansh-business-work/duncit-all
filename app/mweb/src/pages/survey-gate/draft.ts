import type { ActiveSurvey, SurveyKind } from './queries';
import type { CategoryScope } from './CategoryStep';
import type { FieldAnswer } from './SurveyQuestionField';
import type { SurveyAnswerInput } from './SurveyStepper';

export type GateStep = 'category' | 'survey' | 'meeting';

/** The in-progress Earn onboarding draft — category scope + survey answers +
 *  which step the user reached — so pressing Back and returning restores it. */
export interface GateDraft {
  step: GateStep;
  scope: CategoryScope | null;
  survey: ActiveSurvey | null;
  answers: Record<string, FieldAnswer>;
  submittedAnswers: SurveyAnswerInput[];
}

/** Per-kind (host / venue / ecomm) draft cache for the Earn onboarding gate.
 *  Kept in memory (module scope) — it just needs to outlive the survey page
 *  unmounting on a Back navigation within the SPA session. */
const drafts = new Map<SurveyKind, GateDraft>();

export const getGateDraft = (kind: SurveyKind): GateDraft | undefined => drafts.get(kind);
export const setGateDraft = (kind: SurveyKind, draft: GateDraft): void => {
  drafts.set(kind, draft);
};
export const clearGateDraft = (kind: SurveyKind): void => {
  drafts.delete(kind);
};
