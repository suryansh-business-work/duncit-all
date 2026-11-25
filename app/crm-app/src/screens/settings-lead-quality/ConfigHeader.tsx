import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack, useTheme } from 'tamagui';
import { CRM_QUALITY_CONFIG_STATUS_KEY, CRM_QUALITY_CONFIG_STATUS_TONE } from '@duncit/utils';

import { Card } from '@/components/Card';
import { DuncitButton } from '@/components/DuncitButton';
import { ToneChip } from '@/components/ToneChip';
import type { QualitySettings } from '@/features/lead-quality-settings/editor';
import { displayDateTime } from '@/features/reminders/reminderTime';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  settings: QualitySettings;
  busy: boolean;
  /** Start a draft from the published version (offered only while there is no draft). */
  onEdit: () => void;
  /** Discard the draft of this version. */
  onDiscard: (version: number) => void;
}

/** The version in use, who published it and when, and the draft being edited (if any). */
export function ConfigHeader({ settings, busy, onEdit, onDiscard }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { published, draft } = settings;
  return (
    <Card testID="lead-quality-header">
      <XStack alignItems="center" gap="$2" flexWrap="wrap">
        <Text fontWeight="700" fontSize="$6" role="heading">
          {t('crm.leadQualitySettings.publishedVersion', { vars: { version: published.version } })}
        </Text>
        <ToneChip
          label={t(CRM_QUALITY_CONFIG_STATUS_KEY.PUBLISHED)}
          tone={CRM_QUALITY_CONFIG_STATUS_TONE.PUBLISHED}
        />
        {draft ? (
          <ToneChip
            label={t('crm.leadQualitySettings.draftChip', { vars: { version: draft.version } })}
            tone={CRM_QUALITY_CONFIG_STATUS_TONE.DRAFT}
          />
        ) : null}
      </XStack>
      {published.published_at ? (
        <Text color="$muted" fontSize="$2">
          {t('crm.leadQualitySettings.publishedBy', {
            vars: {
              name: published.published_by?.name ?? '',
              date: displayDateTime(published.published_at),
            },
          })}
        </Text>
      ) : null}
      <Text color="$muted" fontSize="$2" aria-live="polite" testID="lead-quality-draft-status">
        {draft
          ? t('crm.leadQualitySettings.draftStatus', {
              vars: {
                version: draft.version,
                name: draft.updated_by.name,
                date: displayDateTime(draft.updated_at),
              },
            })
          : t('crm.leadQualitySettings.draftNone')}
      </Text>
      <YStack marginTop="$2">
        {draft ? (
          <DuncitButton
            label={t('crm.leadQualitySettings.discardDraft')}
            onPress={() => onDiscard(draft.version)}
            variant="outline"
            tone="danger"
            disabled={busy}
            icon={<MaterialIcons name="delete" size={20} color={theme.danger?.val} />}
            testID="lead-quality-discard"
          />
        ) : (
          <DuncitButton
            label={t('crm.leadQualitySettings.edit')}
            onPress={onEdit}
            disabled={busy}
            icon={<MaterialIcons name="edit" size={20} color={theme.onPrimary?.val} />}
            testID="lead-quality-edit"
          />
        )}
      </YStack>
    </Card>
  );
}
