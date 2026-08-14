import { ActivityIndicator, Switch } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { whatsappCategoryCopy } from '@duncit/i18n';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { WhatsAppPreferenceCategory } from '@/hooks/useWhatsAppPreferences';

interface Props {
  item: WhatsAppPreferenceCategory;
  busy: boolean;
  onChange: (category: string, enabled: boolean) => void;
}

/**
 * One kind of WhatsApp message, with its switch. Tamagui twin of mWeb's
 * WhatsAppPreferenceRow — a required category is shown and locked rather than
 * hidden, because "will my refund still reach me?" is the question people have.
 */
export function WhatsAppPreferenceRow({ item, busy, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const { primary, muted } = useThemeColors();
  const copy = whatsappCategoryCopy(t, item.category);

  return (
    <XStack
      testID={`whatsapp-preference-${item.category}`}
      alignItems="flex-start"
      gap={12}
      paddingVertical={12}
    >
      <YStack flex={1}>
        <XStack alignItems="center" gap={6}>
          <Text fontSize={14.5} fontWeight="700" color="$color">
            {copy.label}
          </Text>
          {item.required ? (
            <XStack alignItems="center" gap={3}>
              <MaterialIcons name="lock-outline" size={13} color={muted} />
              <Text fontSize={11.5} fontWeight="700" color="$muted">
                {t('whatsappPreference.alwaysOn')}
              </Text>
            </XStack>
          ) : null}
        </XStack>
        <Text fontSize={12.5} color="$muted" paddingTop={2}>
          {copy.description}
        </Text>
      </YStack>

      {busy ? (
        <ActivityIndicator testID={`whatsapp-preference-busy-${item.category}`} color={primary} />
      ) : (
        <Switch
          testID={`whatsapp-preference-switch-${item.category}`}
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
