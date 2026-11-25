import { useEffect, useMemo, useState } from 'react';
import { FormProvider, useForm, type FieldPath } from 'react-hook-form';
import { Text, YStack } from 'tamagui';
import {
  isLeadQualityLeaf,
  leadQualityFieldName,
  leadQualityIssueMessage,
  type LeadQualityIssueLike,
} from '@duncit/forms/schemas';

import { RADII } from '@/constants/design';
import {
  LEAD_QUALITY_EDITOR,
  type QualityConfig,
  type QualityFormValues,
  type QualitySubmission,
} from '@/features/lead-quality-settings/editor';
import { useTranslation } from '@/hooks/useTranslation';
import { formResolver } from '@/utils/form-resolver';
import { BandsFields } from './BandsFields';
import { CriteriaFields } from './CriteriaFields';
import { FormActions } from './FormActions';
import { LiveIssuesProvider } from './LiveIssues';
import { QualificationFields } from './QualificationFields';

interface Props {
  /** The draft being edited. */
  config: QualityConfig;
  /** A save or publish is running. */
  busy: boolean;
  /** Problems the server refused the last save with, put back on their fields. */
  serverIssues: readonly LeadQualityIssueLike[];
  onSaveDraft: (submission: QualitySubmission) => void;
  /** Called only once the configuration passes the publish rules (exactly 100%). */
  onPublish: (submission: QualitySubmission) => void;
}

const isLeaf = (name: string): name is FieldPath<QualityFormValues> => isLeadQualityLeaf(name);

/**
 * One lead type's draft scoring model — the criteria builder, the
 * qualification rule and the classification bands. Save draft checks the
 * draft rules (never over 100%); Publish checks the publish rules (exactly
 * 100%, every criterion's sub-criteria adding up to it) — the same rules the
 * server and the portal apply.
 */
export function LeadQualityConfigForm({
  config,
  busy,
  serverIssues,
  onSaveDraft,
  onPublish,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const resolver = useMemo(
    () => formResolver<QualityFormValues>(LEAD_QUALITY_EDITOR.schema(t, 'DRAFT')),
    [t],
  );
  const publishSchema = useMemo(() => LEAD_QUALITY_EDITOR.schema(t, 'PUBLISH'), [t]);
  // The form is keyed per stored version, so what it loaded never changes underneath it.
  const loaded = useMemo(() => LEAD_QUALITY_EDITOR.fromConfig(config), [config]);
  const loadedInput = useMemo(() => JSON.stringify(LEAD_QUALITY_EDITOR.toInput(loaded)), [loaded]);
  const methods = useForm<QualityFormValues>({ resolver, mode: 'onChange', defaultValues: loaded });
  const { handleSubmit, setError } = methods;
  const [refused, setRefused] = useState(false);

  useEffect(() => {
    for (const issue of serverIssues) {
      const name = leadQualityFieldName(issue.path);
      if (isLeaf(name))
        setError(name, { type: 'server', message: leadQualityIssueMessage(t, issue) });
    }
  }, [serverIssues, setError, t]);
  const listIssues = serverIssues.filter(
    (issue) => !isLeadQualityLeaf(leadQualityFieldName(issue.path)),
  );

  /** Dirty = what would be sent differs from what was loaded (decided at submit time). */
  const submission = (values: QualityFormValues): QualitySubmission => {
    const input = LEAD_QUALITY_EDITOR.toInput(values);
    const changeNote = values.change_note.trim();
    return {
      input,
      change_note: changeNote,
      dirty: JSON.stringify(input) !== loadedInput || changeNote !== loaded.change_note.trim(),
    };
  };

  const save = handleSubmit((values) => {
    setRefused(false);
    onSaveDraft(submission(values));
  });
  const publish = handleSubmit(
    (values) => {
      const allowed = publishSchema.safeParse(values).success;
      setRefused(!allowed);
      if (allowed) onPublish(submission(values));
    },
    () => setRefused(true),
  );

  return (
    <FormProvider {...methods}>
      <LiveIssuesProvider>
        <YStack gap="$5" testID="lead-quality-config-form">
          {serverIssues.length > 0 ? (
            <YStack
              role="alert"
              gap="$1"
              backgroundColor="$dangerSoft"
              padding="$3"
              borderRadius={RADII.sm}
              testID="lead-quality-server-issues"
            >
              <Text color="$danger" fontWeight="700">
                {t('crm.leadQualitySettings.serverRefused')}
              </Text>
              {listIssues.map((issue) => (
                <Text key={`${issue.path}:${issue.code}`} color="$danger">
                  {leadQualityIssueMessage(t, issue)}
                </Text>
              ))}
            </YStack>
          ) : null}
          <CriteriaFields />
          <QualificationFields />
          <BandsFields />
          <FormActions busy={busy} refused={refused} onSave={save} onPublish={publish} />
        </YStack>
      </LiveIssuesProvider>
    </FormProvider>
  );
}
