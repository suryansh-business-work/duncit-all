import { useFormContext } from 'react-hook-form';
import { XStack, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { StatusBox } from '@/components/settings-editors/StatusBox';
import { TextField } from '@/components/TextField';
import type { QualityFormValues } from '@/features/lead-quality-settings/editor';
import { useTranslation } from '@/hooks/useTranslation';
import { AuthAlert } from '@/screens/auth/AuthAlert';
import { useLiveIssues } from './LiveIssues';

interface Props {
  busy: boolean;
  /** The last Publish press was refused by the publish rules. */
  refused: boolean;
  onSave: () => void;
  onPublish: () => void;
}

/** The change note, what still blocks publishing, and Save draft / Publish. */
export function FormActions({ busy, refused, onSave, onPublish }: Readonly<Props>) {
  const { t } = useTranslation();
  const { control } = useFormContext<QualityFormValues>();
  const { issues } = useLiveIssues();
  return (
    <YStack gap="$3">
      <TextField
        control={control}
        name="change_note"
        label={t('crm.leadQualitySettings.changeNote')}
        hint={t('crm.leadQualitySettings.changeNoteHint')}
        multiline
        testID="lead-quality-change-note"
      />
      <StatusBox
        tone={issues.length > 0 ? 'warning' : 'success'}
        message={
          issues.length > 0
            ? t('crm.leadQualitySettings.publishBlocked', { count: issues.length })
            : t('crm.leadQualitySettings.publishReady')
        }
        testID="lead-quality-publish-hint"
      />
      {refused ? (
        <AuthAlert
          message={t('crm.leadQualitySettings.publishRefused')}
          testID="lead-quality-publish-refused"
        />
      ) : null}
      <XStack gap="$2">
        <YStack flex={1}>
          <DuncitButton
            label={t('crm.leadQualitySettings.saveDraft')}
            onPress={onSave}
            variant="outline"
            loading={busy}
            fullWidth
            testID="lead-quality-save"
          />
        </YStack>
        <YStack flex={1}>
          <DuncitButton
            label={t('crm.leadQualitySettings.publish')}
            onPress={onPublish}
            disabled={busy}
            fullWidth
            testID="lead-quality-publish"
          />
        </YStack>
      </XStack>
    </YStack>
  );
}
