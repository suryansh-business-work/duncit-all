import { ActivityIndicator, Switch } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

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
  const base = `mailPreference.categories.${item.category}`;

  return (
    <XStack
      testID={`mail-preference-${item.category}`}
      alignItems="flex-start"
      gap={12}
      paddingVertical={12}
    >
      <YStack flex={1}>
        <XStack alignItems="center" gap={6}>
          <Text fontSize={14.5} fontWeight="700" color="$color">
            {t(`${base}.label`)}
          </Text>
          {item.required ? (
            <XStack alignItems="center" gap={3}>
              <MaterialIcons name="lock-outline" size={13} color={muted} />
              <Text fontSize={11.5} fontWeight="700" color="$muted">
                {t('mailPreference.alwaysOn')}
              </Text>
            </XStack>
          ) : null}
        </XStack>
        <Text fontSize={12.5} color="$muted" paddingTop={2}>
          {t(`${base}.description`)}
        </Text>
      </YStack>

      {busy ? (
        <ActivityIndicator testID={`mail-preference-busy-${item.category}`} color={primary} />
      ) : (
        <Switch
          testID={`mail-preference-switch-${item.category}`}
          aria-label={t(`${base}.label`)}
          value={item.enabled}
          disabled={item.required}
          onValueChange={(next) => onChange(item.category, next)}
          trackColor={{ true: primary }}
        />
      )}
    </XStack>
  );
}
