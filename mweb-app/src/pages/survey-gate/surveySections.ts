import type { SurveyQuestion } from './queries';

export interface SurveySection {
  title: string;
  help?: string | null;
  questions: SurveyQuestion[];
}

/**
 * Split a flat question list into stepper sections — one step per SECTION
 * heading. Questions before the first section fall under `fallbackTitle`.
 * Sections with no input questions are dropped. No sections → a single step.
 */
export function splitSections(questions: SurveyQuestion[], fallbackTitle = 'Details'): SurveySection[] {
  const sections: SurveySection[] = [];
  let current: SurveySection | null = null;
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
