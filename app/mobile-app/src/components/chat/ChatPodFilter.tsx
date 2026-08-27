import { useTranslation } from '@/hooks/useTranslation';
import { Text, XStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import type { Translate } from '@/i18n/fallback';
import { PRESS_STYLE } from '@duncit/buttons-native';

export type ChatPodFilterValue = 'ALL' | 'UPCOMING' | 'PREVIOUS';

const options = (t: Translate): { value: ChatPodFilterValue; label: string }[] => [
  { value: 'ALL', label: t('mweb.common.all') },
  { value: 'UPCOMING', label: t('mweb.chat.upcomingPods') },
  { value: 'PREVIOUS', label: t('mweb.chat.previousPods') },
];

interface Props {
  value: ChatPodFilterValue;
  onChange: (value: ChatPodFilterValue) => void;
}

/** Single-select chips that narrow the chat list by the linked pod's status
 * (All / Upcoming / Previous). Twin of mWeb's ChatsPage status chips. */
export function ChatPodFilter({ value, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const { color: ink, primary, onPrimary } = useThemeColors();
  return (
    <XStack gap={8} paddingHorizontal={16} paddingTop={12} flexWrap="wrap">
      {options(t).map((option) => {
        const selected = option.value === value;
        return (
          <XStack
            key={option.value}
            testID={`chat-filter-${option.value}`}
            role="button"
            aria-label={option.label}
            aria-pressed={selected}
            onPress={() => onChange(option.value)}
            paddingHorizontal={14}
            height={34}
            alignItems="center"
            justifyContent="center"
            borderRadius={999}
            borderWidth={1}
            borderColor={selected ? primary : '$borderColor'}
            backgroundColor={selected ? primary : 'transparent'}
            pressStyle={PRESS_STYLE.row}
          >
            <Text
              fontSize={12.5}
              fontWeight={selected ? '700' : '600'}
              color={selected ? onPrimary : ink}
            >
              {option.label}
            </Text>
          </XStack>
        );
      })}
    </XStack>
  );
}
