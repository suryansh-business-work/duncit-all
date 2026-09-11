import { Text, XStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  title: string;
  /** Right-hand link text, e.g. "See all". Needs `onAction`. */
  actionLabel?: string;
  onAction?: () => void;
  testID?: string;
  /** testID / accessible name of the action itself, where a screen already
   * addresses its "See all" (e.g. `previous-pods-see-all`). */
  actionTestID?: string;
  actionAriaLabel?: string;
}

/**
 * A section's title row: the title on the left, an optional accent "See all"
 * on the right. One look for every rail and list on every screen. mWeb twin:
 * components/SectionHeader.
 */
export function SectionHeader({
  title,
  actionLabel,
  onAction,
  testID,
  actionTestID,
  actionAriaLabel,
}: Readonly<Props>) {
  return (
    <XStack testID={testID} alignItems="center" justifyContent="space-between" gap={8}>
      <Text
        accessibilityRole="header"
        flexShrink={1}
        fontSize={17}
        fontWeight="600"
        color="$color"
        numberOfLines={1}
      >
        {title}
      </Text>
      {actionLabel && onAction ? (
        <Text
          testID={actionTestID}
          accessibilityRole="button"
          aria-label={actionAriaLabel}
          onPress={onAction}
          pressStyle={PRESS_STYLE.inline}
          hitSlop={10}
          fontSize={13}
          fontWeight="600"
          color="$accent"
        >
          {actionLabel}
        </Text>
      ) : null}
    </XStack>
  );
}
