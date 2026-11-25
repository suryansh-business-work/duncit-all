import { MaterialIcons } from '@expo/vector-icons';
import { useController, type Control } from 'react-hook-form';
import { Text, XStack, YStack, useTheme } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { Toggle } from '@/components/Toggle';
import type { TemplateDraft } from '@/features/email-templates/draft';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  control: Control<TemplateDraft>;
  dirty: boolean;
  busy: boolean;
  onSave: () => void;
  onSendTest: () => void;
  onDelete: () => void;
}

/** Save (once something changed), Send test, Delete and Active — the portal editor's action bar. */
export function EditorActions({
  control,
  dirty,
  busy,
  onSave,
  onSendTest,
  onDelete,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const active = useController({ control, name: 'is_active' });
  return (
    <YStack gap="$3">
      <XStack alignItems="center" gap="$3">
        <Toggle
          checked={active.field.value}
          onChange={active.field.onChange}
          label={t('crm.common.active')}
          testID="template-active"
        />
        <Text flex={1}>{t('crm.common.active')}</Text>
        {dirty ? (
          <Text color="$warning" fontSize="$2" aria-live="polite" testID="template-unsaved">
            {t('crm.emailTemplates.unsavedChanges')}
          </Text>
        ) : null}
      </XStack>
      <DuncitButton
        label={busy ? t('shell.common.saving') : t('shell.common.save')}
        onPress={onSave}
        loading={busy}
        disabled={!dirty || busy}
        fullWidth
        icon={<MaterialIcons name="save" size={18} color={theme.onPrimary?.val} />}
        testID="template-save"
      />
      <XStack gap="$2">
        <YStack flex={1}>
          <DuncitButton
            label={t('crm.emailTemplates.sendTest')}
            onPress={onSendTest}
            variant="outline"
            fullWidth
            icon={<MaterialIcons name="send" size={18} color={theme.accentText?.val} />}
            testID="template-send-test"
          />
        </YStack>
        <YStack flex={1}>
          <DuncitButton
            label={t('shell.common.delete')}
            onPress={onDelete}
            variant="outline"
            tone="danger"
            fullWidth
            icon={<MaterialIcons name="delete-outline" size={18} color={theme.danger?.val} />}
            testID="template-delete"
          />
        </YStack>
      </XStack>
    </YStack>
  );
}
