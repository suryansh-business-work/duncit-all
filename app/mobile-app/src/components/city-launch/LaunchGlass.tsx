import type { ReactNode } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack, type YStackProps } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';

import type { MaterialIconName } from './launchIcons';

/**
 * The frosted panel every block of the waitlist sits in: a dark translucent
 * fill with a hairline edge. The numbers are the ones mWeb draws with
 * (rule 27); mWeb adds a blur that native cannot.
 */
export const GLASS = {
  backgroundColor: 'rgba(20,20,28,0.55)',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.16)',
  borderRadius: 24,
} as const;

/** Every word on the page is white over the scrimmed video. */
export const LAUNCH_INK = 'white';

export function LaunchGlass({
  children,
  testID,
  ...rest
}: Readonly<{ children: ReactNode; testID?: string } & YStackProps>) {
  return (
    <YStack testID={testID} {...GLASS} padding={20} {...rest}>
      {children}
    </YStack>
  );
}

/** The role's name in a small dark capsule — HOST, VENUE PARTNER, CLUB ADMIN. */
export function LaunchBadge({
  icon,
  label,
  testID,
}: Readonly<{ icon: MaterialIconName; label: string; testID?: string }>) {
  const { accent } = useThemeColors();
  return (
    <XStack
      testID={testID}
      alignSelf="center"
      alignItems="center"
      gap={6}
      paddingHorizontal={14}
      paddingVertical={6}
      borderRadius={999}
      backgroundColor="rgba(9,9,15,0.85)"
      borderWidth={1}
      borderColor="rgba(255,255,255,0.28)"
    >
      <MaterialIcons name={icon} size={18} color={accent} />
      <Text
        fontSize={13}
        fontWeight="700"
        letterSpacing={1.5}
        textTransform="uppercase"
        color={LAUNCH_INK}
      >
        {label}
      </Text>
    </XStack>
  );
}

/** The section's headline, with the red stroke drawn under its last line. */
export function LaunchHeadline({
  children,
  testID,
}: Readonly<{ children: ReactNode; testID?: string }>) {
  return (
    <YStack gap={8} alignItems="flex-start">
      <Text
        testID={testID}
        role="heading"
        fontSize={34}
        lineHeight={38}
        fontWeight="700"
        letterSpacing={-0.5}
        color={LAUNCH_INK}
      >
        {children}
      </Text>
      <YStack
        width={120}
        height={5}
        borderRadius={999}
        backgroundColor="$primary"
        rotate="-1.5deg"
      />
    </YStack>
  );
}

/** The small hand-written aside at the top of a section ("Same city. New people."). */
export function LaunchTagline({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <Text
      alignSelf="flex-end"
      fontSize={14}
      lineHeight={18}
      fontStyle="italic"
      color={LAUNCH_INK}
      opacity={0.92}
    >
      {children}
    </Text>
  );
}

/** The closing line at the foot of a section, spaced out in capitals with the heart after it. */
export function LaunchFooterLine({
  children,
  testID,
}: Readonly<{ children: ReactNode; testID?: string }>) {
  const { accent } = useThemeColors();
  return (
    <XStack
      testID={testID}
      alignSelf="center"
      alignItems="center"
      gap={8}
      paddingHorizontal={16}
      paddingVertical={8}
      {...GLASS}
      borderRadius={999}
    >
      <Text
        flexShrink={1}
        fontSize={12}
        fontWeight="600"
        letterSpacing={2}
        textTransform="uppercase"
        textAlign="center"
        color={LAUNCH_INK}
      >
        {children}
      </Text>
      <MaterialIcons name="favorite-border" size={18} color={accent} />
    </XStack>
  );
}
