import { useState, type ReactNode } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { SurfaceCard } from '@/components/SurfaceCard';
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
 * icon on a soft disc, the title and a one-line caption — on a surface card,
 * the Tamagui twin of the MUI AdvancedAccordion (rule 27). Four sections share
 * it so the frame and the expand affordance cannot drift apart.
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
  const { accent, danger, muted } = useThemeColors();
  const isError = tone === 'error';

  return (
    <SurfaceCard
      testID={testID}
      padding={0}
      overflow="hidden"
      borderColor={isError ? '$danger' : '$cardBorder'}
    >
      <XStack
        testID={`${testID}-toggle`}
        role="button"
        aria-label={title}
        aria-expanded={open}
        onPress={() => setOpen((value) => !value)}
        alignItems="center"
        gap={12}
        padding={16}
        pressStyle={PRESS_STYLE.row}
      >
        <YStack
          width={36}
          height={36}
          borderRadius={18}
          alignItems="center"
          justifyContent="center"
          backgroundColor={isError ? '$dangerSoft' : '$soft'}
        >
          <MaterialIcons name={icon} size={20} color={isError ? danger : accent} />
        </YStack>
        <YStack flex={1}>
          <Text fontSize={15} fontWeight="600" color={isError ? '$danger' : '$color'}>
            {title}
          </Text>
          <Text fontSize={12} color="$muted">
            {caption}
          </Text>
        </YStack>
        <MaterialIcons name={open ? 'expand-less' : 'expand-more'} size={22} color={muted} />
      </XStack>
      {open ? (
        <YStack padding={16} paddingTop={0} gap={12}>
          {children}
        </YStack>
      ) : null}
    </SurfaceCard>
  );
}
