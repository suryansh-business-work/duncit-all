import type { ComponentProps } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { PRESS_STYLE } from '@duncit/buttons-native';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

interface LabelProps {
  /** A small state icon at the left (booked, searching…). */
  icon?: IconName;
  iconColor?: string;
  /** The muted line above the value — "Price", "You're hosting". */
  caption?: string;
  value: string;
  /** `price` is the 18/700 figure; `title` a 16/600 state name. */
  emphasis?: 'price' | 'title';
  /** A muted footnote under the value. */
  note?: string | null;
  valueTestID?: string;
  noteTestID?: string;
}

/**
 * The left half of the booking bar: what this booking is, or costs.
 * mWeb twin: pod-details-page/BarLabel.
 */
export function BarLabel({
  icon,
  iconColor,
  caption,
  value,
  emphasis = 'title',
  note,
  valueTestID,
  noteTestID,
}: Readonly<LabelProps>) {
  const price = emphasis === 'price';
  return (
    <XStack flex={1} alignItems="center" gap={8}>
      {icon ? <MaterialIcons name={icon} size={22} color={iconColor} /> : null}
      <YStack flex={1}>
        {caption ? (
          <Text fontSize={11} color="$muted">
            {caption}
          </Text>
        ) : null}
        <Text
          testID={valueTestID}
          fontSize={price ? 18 : 16}
          fontWeight={price ? '700' : '600'}
          color="$color"
          numberOfLines={1}
        >
          {value}
        </Text>
        {note ? (
          <Text testID={noteTestID} fontSize={11} color="$muted">
            {note}
          </Text>
        ) : null}
      </YStack>
    </XStack>
  );
}

interface CtaProps {
  testID: string;
  label: string;
  onPress: () => void;
  /** The accessible name when it should say more than the label. */
  ariaLabel?: string;
  disabled?: boolean;
  /** `danger` is the outlined Backout pill; everything else is the green CTA. */
  tone?: 'primary' | 'danger';
}

/** The booking bar's action — a 48px pill, green unless it backs out. */
export function BarCta({
  testID,
  label,
  onPress,
  ariaLabel,
  disabled = false,
  tone = 'primary',
}: Readonly<CtaProps>) {
  const danger = tone === 'danger';
  const fill = danger ? 'transparent' : '$primary';
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={ariaLabel ?? label}
      aria-disabled={disabled}
      onPress={disabled ? undefined : onPress}
      alignItems="center"
      justifyContent="center"
      paddingHorizontal={danger ? 20 : 24}
      height={48}
      borderRadius={999}
      borderWidth={danger ? 1 : 0}
      borderColor="$danger"
      backgroundColor={disabled && !danger ? '$muted' : fill}
      opacity={disabled ? 0.6 : 1}
      pressStyle={PRESS_STYLE.control}
    >
      <Text fontSize={15} fontWeight="600" color={danger ? '$danger' : '$onPrimary'}>
        {label}
      </Text>
    </XStack>
  );
}
