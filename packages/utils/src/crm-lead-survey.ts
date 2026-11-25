/**
 * A CRM lead's onboarding survey: its steps, the answers being filled in, what
 * is still missing, the share link and how each logged entry reads. Shared by
 * the CRM portal's Survey tab and the Duncit CRM app's.
 */
import type { CrmTone } from './crm-quality-labels';

export interface CrmSurveyQuestionLike {
  qid: string;
  type: string;
  label: string;
  help?: string | null;
  required: boolean;
  multi: boolean;
}

export interface CrmSurveySection<Q> {
  title: string;
  help?: string | null;
  questions: Q[];
}

/**
 * Split a flat question list into stepper sections — one step per SECTION
 * heading. Questions before the first section fall under `fallbackTitle`.
 * Sections with no input questions are dropped. No sections → a single step.
 */
export function crmSplitSurveySections<Q extends Omit<CrmSurveyQuestionLike, 'qid' | 'required' | 'multi'>>(
  questions: readonly Q[],
  fallbackTitle = 'Details'
): CrmSurveySection<Q>[] {
  const sections: CrmSurveySection<Q>[] = [];
  let current: CrmSurveySection<Q> | null = null;
  for (const q of questions) {
    if (q.type === 'SECTION') {
      current = { title: q.label || fallbackTitle, help: q.help, questions: [] };
      sections.push(current);
      continue;
    }
    if (!current) {
      current = { title: fallbackTitle, questions: [] };
      sections.push(current);
    }
    current.questions.push(q);
  }
  return sections.filter((s) => s.questions.length > 0);
}

/** One question's answer while the survey is being filled: free text, or the options picked. */
export interface CrmSurveyFieldAnswer {
  value: string;
  values: string[];
}

export type CrmSurveyAnswers = Record<string, CrmSurveyFieldAnswer>;

/** The answers an entry was saved with, ready to edit. */
export function crmSeedSurveyAnswers(
  initial?: readonly { qid: string; value?: string | null; values: readonly string[] }[] | null
): CrmSurveyAnswers {
  const answers: CrmSurveyAnswers = {};
  for (const a of initial ?? []) answers[a.qid] = { value: a.value ?? '', values: [...a.values] };
  return answers;
}

const EMPTY: CrmSurveyFieldAnswer = { value: '', values: [] };

/** A question's answer so far (empty when untouched). */
export const crmSurveyAnswer = (answers: CrmSurveyAnswers, qid: string): CrmSurveyFieldAnswer => answers[qid] ?? EMPTY;

const isMultiChoice = (q: Pick<CrmSurveyQuestionLike, 'type' | 'multi'>) => q.type === 'MCQ' && q.multi;

/** The first required question left blank, or null when the step can move on. */
export function crmFirstUnanswered<Q extends CrmSurveyQuestionLike>(questions: readonly Q[], answers: CrmSurveyAnswers): Q | null {
  for (const q of questions) {
    if (!q.required) continue;
    const a = crmSurveyAnswer(answers, q.qid);
    const filled = isMultiChoice(q) ? a.values.length > 0 : a.value.trim() !== '';
    if (!filled) return q;
  }
  return null;
}

export interface CrmSurveyAnswerInput {
  qid: string;
  value?: string | null;
  values?: string[];
}

/** Every question's answer as saveLeadSurveyResponse takes it: picked options for a multi-choice, text otherwise. */
export function crmSurveyAnswerInput(questions: readonly CrmSurveyQuestionLike[], answers: CrmSurveyAnswers): CrmSurveyAnswerInput[] {
  return questions.map((q) =>
    isMultiChoice(q)
      ? { qid: q.qid, values: crmSurveyAnswer(answers, q.qid).values }
      : { qid: q.qid, value: crmSurveyAnswer(answers, q.qid).value }
  );
}

/** Tick or untick one option of a multi-choice answer. */
export function crmToggleSurveyOption(answer: CrmSurveyFieldAnswer, option: string): CrmSurveyFieldAnswer {
  const values = answer.values.includes(option) ? answer.values.filter((v) => v !== option) : [...answer.values, option];
  return { ...answer, values };
}

/** The public fill page for a share token, on the CRM's own host (open to anyone with the link). */
export const crmSurveyLinkUrl = (origin: string, token: string): string => `${origin}/s/${token}`;

export interface CrmSurveyEntryLike {
  source: string;
  token_revoked: boolean;
  filled: boolean;
}

/** How a logged generation / response reads: a revoked link, filled, or still pending. */
export function crmSurveyEntryStatus(entry: CrmSurveyEntryLike): { labelKey: string; tone: CrmTone } {
  if (entry.source === 'LINK' && entry.token_revoked) return { labelKey: 'crm.components.revoked', tone: 'default' };
  if (entry.filled) return { labelKey: 'crm.components.filled', tone: 'success' };
  return { labelKey: 'crm.components.pending', tone: 'warning' };
}

/** A link entry whose link still works, so it can be shared or revoked. */
export const crmSurveyLinkLive = (entry: CrmSurveyEntryLike & { token?: string | null }): boolean =>
  entry.source === 'LINK' && !entry.token_revoked && Boolean(entry.token);
