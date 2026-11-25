import { Text, YStack } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';
import type { LeadSurveyDef, LeadSurveyEntry } from './SurveyState';
import { TabSheet } from './TabSheet';

interface Props {
  entry: LeadSurveyEntry | null;
  survey: LeadSurveyDef | null;
  onClose: () => void;
}

/** A filled entry's answers, each under its question — the portal's "Survey answers" dialog. */
export function SurveyAnswers({ entry, survey, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const labelFor = (qid: string) => survey?.questions.find((q) => q.qid === qid)?.label ?? qid;
  const answers = entry?.answers ?? [];
  return (
    <TabSheet
      open={Boolean(entry)}
      title={t('crm.components.surveyAnswers')}
      onClose={onClose}
      testID="survey-answers"
    >
      {answers.map((a) => (
        <YStack key={a.qid} gap="$1">
          <Text color="$muted" fontSize="$2" fontWeight="700">
            {labelFor(a.qid)}
          </Text>
          <Text>
            {(a.values.length ? a.values.join(', ') : a.value) || t('crmApp.common.dash')}
          </Text>
        </YStack>
      ))}
      {answers.length === 0 ? (
        <Text color="$muted">{t('crm.components.noAnswersRecorded')}</Text>
      ) : null}
    </TabSheet>
  );
}
