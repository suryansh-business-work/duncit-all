import type { ComponentProps } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useThemeColors } from '@/hooks/useThemeColors';
import { PRESS_STYLE } from '@duncit/buttons-native';

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

/** The disabled-state footer: the "Already enabled" status pill, plus a
 * next-step CTA — the card's one green pill — when the user is approved. */
function EnabledStatus({
  testID,
  label,
  cta,
}: Readonly<{ testID: string; label: string; cta?: EarnBoxCta }>) {
  const enabledLabel = (
    <XStack
      alignSelf="flex-start"
      alignItems="center"
      height={28}
      paddingHorizontal={12}
      borderRadius={999}
      backgroundColor="$successSoft"
    >
      <Text testID={`${testID}-enabled`} fontSize={12} fontWeight="600" color="$success">
        {label}
      </Text>
    </XStack>
  );
  if (!cta) return enabledLabel;
  return (
    <XStack alignItems="center" gap={10} flexWrap="wrap">
      {enabledLabel}
      <DuncitButton testID={`${testID}-cta`} label={cta.label} onPress={cta.onPress} size="sm" />
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
  const { accent } = useThemeColors();
  const handlePress = () => {
    if (!disabled) onPress();
  };

  return (
    <SurfaceCard
      testID={testID}
      role="button"
      aria-label={title}
      aria-disabled={disabled}
      onPress={handlePress}
      opacity={disabled && !cta ? 0.55 : 1}
      gap={10}
      pressStyle={disabled ? undefined : PRESS_STYLE.surface}
    >
      <YStack
        width={44}
        height={44}
        borderRadius={22}
        alignItems="center"
        justifyContent="center"
        backgroundColor="$soft"
      >
        <MaterialIcons name={icon} size={22} color={accent} />
      </YStack>
      <Text fontSize={16} fontWeight="600" color="$color">
        {title}
      </Text>
      <Text fontSize={14} color="$muted">
        {description}
      </Text>
      {disabled ? <EnabledStatus testID={testID} label={disabledLabel} cta={cta} /> : null}
    </SurfaceCard>
  );
}
