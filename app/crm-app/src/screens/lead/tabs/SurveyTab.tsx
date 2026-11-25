import { useState } from 'react';
import { Separator, Text, XStack, YStack } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';
import type { CrmSurveyAnswerInput } from '@duncit/utils';

import { Card } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DuncitButton } from '@/components/DuncitButton';
import { StateView } from '@/components/StateView';
import { useTranslation } from '@/hooks/useTranslation';
import { SurveyAnswers } from './SurveyAnswers';
import { SurveyEntryRow } from './SurveyEntryRow';
import { SurveyFill } from './SurveyFill';
import { SurveyPicker } from './SurveyPicker';
import { shareSurveyLink, useLeadSurvey, type LeadSurveyEntry } from './SurveyState';
import { TabAlert } from './TabAlert';
import { isSurveyKind, type LeadTabProps, type SurveyKind } from './TabsBTypes';

const SCOPE = 'crm-app/SurveyTab';

function SurveyPanel({ kind, id }: Readonly<{ kind: SurveyKind; id: string }>) {
  const { t } = useTranslation();
  const s = useLeadSurvey(kind, id);
  const [fill, setFill] = useState<{
    open: boolean;
    seed?: LeadSurveyEntry['answers'];
    key: number;
  }>({
    open: false,
    key: 0,
  });
  const [viewing, setViewing] = useState<LeadSurveyEntry | null>(null);
  const [deleting, setDeleting] = useState<LeadSurveyEntry | null>(null);
  const [saved, setSaved] = useState(false);

  if (s.loading || s.loadError) {
    return <StateView loading={s.loading} error={s.loadError} onRetry={s.refetch} />;
  }
  const picking = s.categories.length > 1 || s.subCategories.length > 1;
  const openFill = (entry?: LeadSurveyEntry) =>
    setFill((f) => ({ open: true, seed: entry?.answers, key: f.key + 1 }));
  const submit = async (answers: CrmSurveyAnswerInput[]) => {
    setSaved(false);
    if (!(await s.save(answers))) return;
    setFill((f) => ({ ...f, open: false }));
    setSaved(true);
  };
  const confirmDelete = async (entry: LeadSurveyEntry) => {
    setDeleting(null);
    await s.remove(entry.id);
  };

  return (
    <Card title={s.survey?.title || t('crm.common.survey')} testID="survey-tab">
      <Text color="$muted">{t('crm.components.fillItAsAStepperShare')}</Text>
      {s.survey ? (
        <XStack gap="$2" flexWrap="wrap">
          <DuncitButton
            label={fill.open ? t('crm.leadSurvey.closeForm') : t('crm.leadSurvey.fillManually')}
            onPress={() => (fill.open ? setFill((f) => ({ ...f, open: false })) : openFill())}
            variant={fill.open ? 'solid' : 'outline'}
            size="sm"
            testID="survey-fill-toggle"
          />
          <DuncitButton
            label={t('crm.leadSurvey.generateLink')}
            onPress={() => fireAndForget(s.generateLink(), logs.mobileApp, SCOPE, 'generateLink')}
            variant="outline"
            size="sm"
            disabled={s.busy}
            testID="survey-generate-link"
          />
        </XStack>
      ) : null}
      {s.error ? (
        <TabAlert tone="danger" onClose={s.clearError} testID="survey-error">
          {s.error}
        </TabAlert>
      ) : null}
      {saved ? (
        <TabAlert tone="success" onClose={() => setSaved(false)} testID="survey-saved">
          {t('crm.leadSurvey.saved')}
        </TabAlert>
      ) : null}
      <SurveyPicker
        categories={s.categories}
        subCategories={s.subCategories}
        categoryId={s.categoryId}
        subCategoryId={s.subCategoryId}
        onCategory={s.pickCategory}
        onSubCategory={s.pickSubCategory}
      />
      {s.survey ? null : (
        <TabAlert tone="info" testID="survey-none">
          {picking ? t('crm.leadSurvey.noSurveySelected') : t('crm.leadSurvey.noSurveyLead')}
        </TabAlert>
      )}
      {s.survey && fill.open ? (
        <YStack gap="$3">
          <SurveyFill
            key={fill.key}
            survey={s.survey}
            initialAnswers={fill.seed}
            submitting={s.busy}
            onSubmit={(answers) => fireAndForget(submit(answers), logs.mobileApp, SCOPE, 'save')}
          />
          <Separator borderColor="$borderColor" />
        </YStack>
      ) : null}
      {s.entries.length === 0 ? (
        <Text color="$muted">{t('crm.components.noSurveysGeneratedYetClickFill')}</Text>
      ) : null}
      {s.entries.map((entry) => (
        <SurveyEntryRow
          key={entry.id}
          entry={entry}
          busy={s.busy}
          onFill={openFill}
          onShare={(e) =>
            fireAndForget(shareSurveyLink(e.token ?? ''), logs.mobileApp, SCOPE, 'share')
          }
          onRevoke={(e) => fireAndForget(s.revoke(e.id), logs.mobileApp, SCOPE, 'revoke')}
          onView={setViewing}
          onDelete={setDeleting}
        />
      ))}
      <SurveyAnswers entry={viewing} survey={s.survey} onClose={() => setViewing(null)} />
      <ConfirmDialog
        open={Boolean(deleting)}
        title={t('crm.components.deleteSurveyEntry')}
        message={t('crm.components.thisPermanentlyRemovesThisGenerationResponse')}
        confirmLabel={t('shell.common.delete')}
        cancelLabel={t('shell.common.cancel')}
        danger
        busy={s.busy}
        onConfirm={() => {
          if (deleting) fireAndForget(confirmDelete(deleting), logs.mobileApp, SCOPE, 'delete');
        }}
        onCancel={() => setDeleting(null)}
        testID="survey-delete"
      />
    </Card>
  );
}

/**
 * The lead's onboarding Survey — fill it here as a stepper, share a public
 * link, and see every generation and response logged (tap one to fill or
 * edit it). Venue and host leads: the kinds the API keeps surveys for.
 */
export function SurveyTab({ kind, id }: Readonly<LeadTabProps>) {
  if (!isSurveyKind(kind)) return null;
  return <SurveyPanel kind={kind} id={id} />;
}
