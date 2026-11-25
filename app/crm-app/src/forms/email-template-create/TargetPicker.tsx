import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack, useTheme } from 'tamagui';

import { SURFACE } from '@/components/surface';
import { TARGET_CHOICES } from '@/features/email-templates/targets';
import { useTranslation } from '@/hooks/useTranslation';
import type { EmailTemplateTarget } from './email-template-create.types';

/** Step one of a new template: who it is for, as the portal's audience cards. */
export function TargetPicker({
  onPick,
}: Readonly<{ onPick: (target: EmailTemplateTarget) => void }>) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <YStack gap="$2">
      <Text color="$muted">{t('crm.emailTemplates.whoIsThisTemplateFor')}</Text>
      {TARGET_CHOICES.map((choice) => (
        <XStack
          key={choice.value}
          {...SURFACE}
          role="button"
          aria-label={t(choice.labelKey)}
          onPress={() => onPick(choice.value)}
          pressStyle={{ backgroundColor: '$soft' }}
          alignItems="center"
          gap="$3"
          testID={`template-target-${choice.value}`}
        >
          <MaterialIcons name={choice.icon} size={24} color={theme.accentText?.val} />
          <YStack flex={1} gap="$1">
            <Text fontWeight="700">{t(choice.labelKey)}</Text>
            <Text color="$muted" fontSize="$2">
              {t(choice.hintKey)}
            </Text>
          </YStack>
        </XStack>
      ))}
    </YStack>
  );
}
