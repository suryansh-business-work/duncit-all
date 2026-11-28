import { XStack } from 'tamagui';

import { MOBILE } from '@/constants/design';
import { haptics } from '@/services/haptics';
import { Glyph, type AnyIcon } from './Glyph';

interface Props {
  icon: AnyIcon;
  /** What the button does, read out by screen readers (the button has no visible label). */
  label: string;
  onPress: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  /** `filled` = the accent's soft wash behind the icon (a quick action on a card). */
  variant?: 'plain' | 'filled';
  /** Overrides the icon colour (the header's white tint). */
  color?: string;
  testID?: string;
}

/** A round icon-only button, one platform touch target across, with a light haptic tick. */
export function IconButton({
  icon,
  label,
  onPress,
  onLongPress,
  disabled = false,
  variant = 'plain',
  color,
  testID,
}: Readonly<Props>) {
  const filled = variant === 'filled';
  const press = () => {
    haptics.tap();
    onPress();
  };
  return (
    <XStack
      role="button"
      aria-label={label}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={disabled ? undefined : press}
      onLongPress={disabled ? undefined : onLongPress}
      width={MOBILE.touch}
      height={MOBILE.touch}
      borderRadius={MOBILE.touch / 2}
      alignItems="center"
      justifyContent="center"
      backgroundColor={filled ? '$primarySoft' : 'transparent'}
      opacity={disabled ? 0.4 : 1}
      pressStyle={{ backgroundColor: filled ? '$navSelected' : '$hover' }}
      testID={testID}
    >
      <Glyph icon={icon} color={color} ink={filled ? 'onPrimarySoft' : 'color'} />
    </XStack>
  );
}
