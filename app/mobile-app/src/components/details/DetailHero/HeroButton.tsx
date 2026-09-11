import type { ComponentProps } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, XStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { useThemeColors } from '@/hooks/useThemeColors';

export type HeroIconName = ComponentProps<typeof MaterialIcons>['name'];

/** The dark disc a control wears over a photo — a black scrim, legible on any
 * picture in either theme (mWeb twin: ClubHeroActions' heroScrim). */
const HERO_SCRIM = 'rgba(0,0,0,0.45)';

interface Props {
  icon: HeroIconName;
  onPress: () => void;
  active?: boolean;
  loading?: boolean;
  /** Sits over the hero photo (the full-bleed club hero) rather than the page. */
  overMedia?: boolean;
  testID?: string;
}

/** A 40px round button — the detail pages' top-bar control (back and the page
 * actions). A surface disc on the page, a dark scrim over a photo. An `active`
 * toggle wears the action green. */
export function HeroButton({
  icon,
  onPress,
  active,
  loading,
  overMedia = false,
  testID,
}: Readonly<Props>) {
  const { color, primary, onPrimary } = useThemeColors();
  const idleColor = overMedia ? onPrimary : color;
  return (
    <XStack
      testID={testID}
      role="button"
      onPress={onPress}
      width={40}
      height={40}
      borderRadius={20}
      alignItems="center"
      justifyContent="center"
      backgroundColor={overMedia ? HERO_SCRIM : '$surface'}
      borderWidth={overMedia ? 0 : 1}
      borderColor="$cardBorder"
      pressStyle={PRESS_STYLE.row}
    >
      {loading ? (
        <Spinner color={idleColor} />
      ) : (
        <MaterialIcons name={icon} size={20} color={active ? primary : idleColor} />
      )}
    </XStack>
  );
}
