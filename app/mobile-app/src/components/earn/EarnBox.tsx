import type { ComponentProps } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

/** Contextual next-step action shown beside the "Already enabled" label for a
 * role the user already holds (e.g. host more, register another venue). */
export interface EarnBoxCta {
  label: string;
  onPress: () => void;
}

interface Props {
  title: string;
  description: string;
  icon: IconName;
  disabled: boolean;
  /** Label shown when disabled (role held / meeting pending). */
  disabledLabel?: string;
  /** When set (approved user), rendered as a button to the right of the label. */
  cta?: EarnBoxCta;
  onPress: () => void;
  testID: string;
}

/** The disabled-state footer: the "Already enabled" label, plus a next-step CTA
 * button to its right when the user is approved for the role. */
function EnabledStatus({
  testID,
  label,
  cta,
}: Readonly<{ testID: string; label: string; cta?: EarnBoxCta }>) {
  const enabledLabel = (
    <Text testID={`${testID}-enabled`} fontSize={12} fontWeight="800" color="$primary">
      {label}
    </Text>
  );
  if (!cta) return enabledLabel;
  return (
    <XStack alignItems="center" gap={10} flexWrap="wrap">
      {enabledLabel}
      <XStack
        testID={`${testID}-cta`}
        role="button"
        aria-label={cta.label}
        onPress={cta.onPress}
        backgroundColor="$primary"
        paddingHorizontal={12}
        height={30}
        borderRadius={999}
        alignItems="center"
        justifyContent="center"
        pressStyle={{ opacity: 0.85 }}
      >
        <Text fontSize={12} fontWeight="900" color="$onPrimary">
          {cta.label}
        </Text>
      </XStack>
    </XStack>
  );
}

/** A single "earn" path card on the Earn with Duncit screen — disabled when the
 * user already holds the matching role. Approved cards keep the "Already enabled"
 * label and add a contextual next-step CTA. */
export function EarnBox({
  title,
  description,
  icon,
  disabled,
  disabledLabel = 'Already enabled',
  cta,
  onPress,
  testID,
}: Readonly<Props>) {
  const { onPrimary } = useThemeColors();
  const handlePress = () => {
    if (!disabled) onPress();
  };

  return (
    <YStack
      testID={testID}
      role="button"
      aria-label={title}
      aria-disabled={disabled}
      onPress={handlePress}
      opacity={disabled && !cta ? 0.55 : 1}
      gap={8}
      padding={16}
      borderRadius={16}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
      pressStyle={disabled ? undefined : { opacity: 0.85 }}
    >
      <YStack
        width={44}
        height={44}
        borderRadius={12}
        alignItems="center"
        justifyContent="center"
        backgroundColor="$primary"
      >
        <MaterialIcons name={icon} size={22} color={onPrimary} />
      </YStack>
      <Text fontSize={16} fontWeight="900" color="$color">
        {title}
      </Text>
      <Text fontSize={13} color="$muted">
        {description}
      </Text>
      {disabled ? <EnabledStatus testID={testID} label={disabledLabel} cta={cta} /> : null}
    </YStack>
  );
}
