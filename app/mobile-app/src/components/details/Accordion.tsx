import type { ComponentProps, ReactNode } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { Reveal } from '@/animations/Reveal';
import { useThemeColors } from '@/hooks/useThemeColors';
import { PRESS_STYLE } from '@duncit/buttons-native';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

interface AccordionProps {
  title: string;
  icon: IconName;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  testID?: string;
  /** When true, tints the header title + border in the theme danger colour
   * (used to flag a section that has validation errors). */
  error?: boolean;
}

/** A single collapsible section: a 24px surface card whose header is an icon
 * disc and a section title — RN port of mWeb's PodAccordion. */
export function Accordion({
  title,
  icon,
  open,
  onToggle,
  children,
  testID,
  error = false,
}: Readonly<AccordionProps>) {
  const { accent, danger, muted } = useThemeColors();
  const borderTint = error ? '$danger' : '$cardBorder';
  const titleTint = error ? '$danger' : '$color';

  return (
    <YStack
      testID={testID}
      borderWidth={1}
      borderColor={borderTint}
      borderRadius={24}
      backgroundColor="$surface"
      marginBottom={12}
      overflow="hidden"
    >
      <XStack
        testID={testID ? `${testID}-header` : undefined}
        role="button"
        aria-label={title}
        aria-expanded={open}
        onPress={onToggle}
        alignItems="center"
        gap={12}
        paddingHorizontal={16}
        paddingVertical={14}
        pressStyle={PRESS_STYLE.control}
      >
        <YStack
          width={36}
          height={36}
          borderRadius={18}
          backgroundColor="$soft"
          alignItems="center"
          justifyContent="center"
        >
          <MaterialIcons name={icon} size={20} color={error ? danger : accent} />
        </YStack>
        <Text flex={1} fontSize={17} fontWeight="600" color={titleTint}>
          {title}
        </Text>
        <MaterialIcons
          name="expand-more"
          size={22}
          color={muted}
          style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
        />
      </XStack>
      {open ? (
        <Reveal>
          <YStack paddingHorizontal={16} paddingBottom={16} gap={8}>
            {children}
          </YStack>
        </Reveal>
      ) : null}
    </YStack>
  );
}
