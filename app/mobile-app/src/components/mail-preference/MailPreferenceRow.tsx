import { ActivityIndicator, Switch } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { mailCategoryCopy } from '@duncit/i18n';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { MailPreferenceCategory } from '@/hooks/useMailPreferences';

interface Props {
  item: MailPreferenceCategory;
  busy: boolean;
  onChange: (category: string, enabled: boolean) => void;
}

/**
 * One kind of email, with its switch. Tamagui twin of mWeb's
 * MailPreferenceRow — a required category is shown and locked rather than
 * hidden, because "will I still get my OTP?" is the question people have.
 */
export function MailPreferenceRow({ item, busy, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const { primary, muted } = useThemeColors();
  const copy = mailCategoryCopy(t, item.category);

  return (
    <XStack
      testID={`mail-preference-${item.category}`}
      alignItems="center"
      gap={12}
      paddingVertical={14}
    >
      <YStack flex={1}>
        <XStack alignItems="center" gap={6}>
          <Text fontSize={15} fontWeight="500" color="$color">
            {copy.label}
          </Text>
          {item.required ? (
            <XStack
              alignItems="center"
              gap={3}
              height={22}
              paddingHorizontal={8}
              borderRadius={999}
              backgroundColor="$soft"
            >
              <MaterialIcons name="lock-outline" size={12} color={muted} />
              <Text fontSize={11} fontWeight="600" color="$muted">
                {t('mailPreference.alwaysOn')}
              </Text>
            </XStack>
          ) : null}
        </XStack>
        <Text fontSize={13} color="$muted" paddingTop={2}>
          {copy.description}
        </Text>
      </YStack>

      {busy ? (
        <ActivityIndicator testID={`mail-preference-busy-${item.category}`} color={primary} />
      ) : (
        <Switch
          testID={`mail-preference-switch-${item.category}`}
          aria-label={copy.label}
          value={item.enabled}
          disabled={item.required}
          onValueChange={(next) => onChange(item.category, next)}
          trackColor={{ true: primary }}
        />
      )}
    </XStack>
  );
}
