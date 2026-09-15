import type { Translate } from '@duncit/shell';
import type { ChipColor } from '../../stress-testing/labels';
import type { ServerAdviceGrade } from '../history/queries';

/** Every key written out literally — the localization gates read keys straight off the source. */
export function adviceGradeLabel(t: Translate, grade: ServerAdviceGrade): string {
  const labels: Record<ServerAdviceGrade, string> = {
    HEALTHY: t('tech.server.gradeHealthy'),
    WATCH: t('tech.server.gradeWatch'),
    ACTION_NEEDED: t('tech.server.gradeActionNeeded'),
    INCONCLUSIVE: t('tech.server.gradeInconclusive'),
  };
  return labels[grade] ?? grade;
}

const GRADE_COLOR: Record<ServerAdviceGrade, ChipColor> = {
  HEALTHY: 'success',
  WATCH: 'warning',
  ACTION_NEEDED: 'error',
  INCONCLUSIVE: 'default',
};

export const adviceGradeColor = (grade: ServerAdviceGrade): ChipColor => GRADE_COLOR[grade] ?? 'default';
