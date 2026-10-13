import { MaterialIcons } from '@expo/vector-icons';
import { XStack, YStack } from 'tamagui';
import { PRESS_STYLE, TOUCH_TARGET } from '@duncit/buttons-native';

import { NoticeCard, type NoticeTone } from '@/components/attendance/NoticeCard';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  tone: NoticeTone;
  title: string;
  body?: string;
  onDismiss: () => void;
  testID: string;
}

/**
 * A notice the member can put away — a dish dropped from the cart, a declined
 * payment. The app's NoticeCard with a close beside it, announced as an alert
 * (the twin of the closable MUI `<Alert>` on mWeb's menu).
 */
export function FoodNotice({ tone, title, body, onDismiss, testID }: Readonly<Props>) {
  const { t } = useTranslation();
  const { color: ink } = useThemeColors();
  return (
    <XStack testID={testID} role="alert" alignItems="flex-start" gap={4}>
      <YStack flex={1}>
        <NoticeCard tone={tone} title={title} body={body} />
      </YStack>
      <XStack
        testID={`${testID}-dismiss`}
        role="button"
        tabIndex={0}
        aria-label={t('mweb.common.close')}
        onPress={onDismiss}
        width={TOUCH_TARGET}
        height={TOUCH_TARGET}
        borderRadius={999}
        alignItems="center"
        justifyContent="center"
        pressStyle={PRESS_STYLE.control}
      >
        <MaterialIcons name="close" size={18} color={ink} />
      </XStack>
    </XStack>
  );
}
