import { Text } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import type { OfferNotice } from '@/hooks/useOfferAnswer';

interface Props {
  notice: OfferNotice | null;
  onDismiss: () => void;
  testID: string;
}

/**
 * What an answer came to once its sheet closed — sent, or "the terms changed
 * while you were reading them" — announced politely; a tap dismisses it.
 */
export function OfferNoticeText({ notice, onDismiss, testID }: Readonly<Props>) {
  if (!notice) return null;
  return (
    <Text
      testID={testID}
      role="button"
      hitSlop={12}
      pressStyle={PRESS_STYLE.inline}
      aria-live="polite"
      fontSize={13}
      color={notice.tone === 'success' ? '$success' : '$warning'}
      onPress={onDismiss}
    >
      {notice.text}
    </Text>
  );
}
