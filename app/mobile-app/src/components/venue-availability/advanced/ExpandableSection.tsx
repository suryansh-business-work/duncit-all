import { useState, type ReactNode } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { useThemeColors } from '@/hooks/useThemeColors';

type IconName = keyof typeof MaterialIcons.glyphMap;

interface Props {
  testID: string;
  icon: IconName;
  title: string;
  caption: string;
  /** `error` frames the section in red — for the destructive bulk actions. */
  tone?: 'default' | 'error';
  children: ReactNode;
}

/**
 * The one header shell every "Advanced settings" section opens with — an
 * icon, a bold title and a one-line caption — the Tamagui twin of the MUI
 * AdvancedAccordion (rule 27). Four sections share it so the frame and the
 * expand affordance cannot drift apart.
 */
export function ExpandableSection({
  testID,
  icon,
  title,
  caption,
  tone = 'default',
  children,
}: Readonly<Props>) {
  const [open, setOpen] = useState(false);
  const { color, danger, muted } = useThemeColors();
  const isError = tone === 'error';

  return (
    <YStack
      testID={testID}
      borderRadius={12}
      borderWidth={1}
      borderColor={isError ? '$danger' : '$borderColor'}
      backgroundColor="$surface"
    >
      <XStack
        testID={`${testID}-toggle`}
        role="button"
        aria-label={title}
        aria-expanded={open}
        onPress={() => setOpen((value) => !value)}
        alignItems="center"
        gap={10}
        padding={12}
        pressStyle={PRESS_STYLE.row}
      >
        <MaterialIcons name={icon} size={20} color={isError ? danger : color} />
        <YStack flex={1}>
          <Text fontSize={14} fontWeight="700" color={isError ? '$danger' : '$color'}>
            {title}
          </Text>
          <Text fontSize={11.5} color="$muted">
            {caption}
          </Text>
        </YStack>
        <MaterialIcons name={open ? 'expand-less' : 'expand-more'} size={22} color={muted} />
      </XStack>
      {open ? (
        <YStack padding={12} paddingTop={0} gap={12}>
          {children}
        </YStack>
      ) : null}
    </YStack>
  );
}
