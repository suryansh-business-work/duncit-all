import type { ComponentProps, ReactNode } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { Reveal } from '@/animations/Reveal';
import { useThemeColors } from '@/hooks/useThemeColors';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

interface AccordionProps {
  title: string;
  icon: IconName;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  testID?: string;
}

/** A single collapsible section — RN port of mWeb's PodAccordion. */
export function Accordion({
  title,
  icon,
  open,
  onToggle,
  children,
  testID,
}: Readonly<AccordionProps>) {
  const { primary, muted } = useThemeColors();

  return (
    <YStack
      testID={testID}
      borderWidth={1}
      borderColor="$borderColor"
      borderRadius={14}
      backgroundColor="$surface"
      marginBottom={10}
      overflow="hidden"
    >
      <XStack
        testID={testID ? `${testID}-header` : undefined}
        role="button"
        aria-label={title}
        aria-expanded={open}
        onPress={onToggle}
        alignItems="center"
        gap={10}
        padding={14}
        pressStyle={{ opacity: 0.8 }}
      >
        <MaterialIcons name={icon} size={18} color={primary} />
        <Text flex={1} fontSize={15} fontWeight="900" color="$color">
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
          <YStack paddingHorizontal={14} paddingBottom={14} gap={8}>
            {children}
          </YStack>
        </Reveal>
      ) : null}
    </YStack>
  );
}
