import { useState } from 'react';
import type { ComponentProps } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { ExploreActionButton } from '@/components/explore/ExploreActionButton';
import { railLayout } from '@/utils/explore-rail';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

export interface ExploreRailAction {
  key: string;
  icon: IconName;
  label: string;
  /** Count drawn under the disc; label-only actions leave it unset. */
  caption?: string;
  onPress: () => void;
  active?: boolean;
  loading?: boolean;
  testID?: string;
  onLabelPress?: () => void;
}

interface ExploreActionRailProps {
  actions: ExploreRailAction[];
  /** Vertical space the rail may occupy; overflow collapses into "More". */
  availableHeight: number;
}

/** Right-side reels action rail that never overlaps the content: it shows as
 * many actions as fit by screen height and collapses the rest into a "More"
 * (⋮) menu. */
export function ExploreActionRail({ actions, availableHeight }: Readonly<ExploreActionRailProps>) {
  const { t } = useTranslation();
  const { color: ink, accent } = useThemeColors();
  const [menuOpen, setMenuOpen] = useState(false);
  const { visible, overflow } = railLayout(actions.length, availableHeight);
  const shown = overflow ? actions.slice(0, visible) : actions;
  const hidden = overflow ? actions.slice(visible) : [];

  return (
    <YStack gap={14} alignItems="center">
      {shown.map((action) => (
        <ExploreActionButton
          key={action.key}
          testID={action.testID}
          icon={action.icon}
          label={action.label}
          caption={action.caption}
          active={action.active}
          loading={action.loading}
          onPress={action.onPress}
          onLabelPress={action.onLabelPress}
        />
      ))}
      {overflow && (
        <YStack alignItems="center">
          <ExploreActionButton
            testID="reel-more"
            icon="more-vert"
            label={t('mweb.explore.more')}
            onPress={() => setMenuOpen((open) => !open)}
          />
          {menuOpen && (
            <YStack
              testID="reel-more-menu"
              position="absolute"
              right={54}
              bottom={0}
              backgroundColor="$surface"
              borderRadius={16}
              borderWidth={1}
              borderColor="$cardBorder"
              padding={6}
              gap={2}
              minWidth={160}
            >
              {hidden.map((action) => (
                <XStack
                  key={action.key}
                  testID={`reel-more-${action.key}`}
                  role="button"
                  aria-label={action.label}
                  onPress={() => {
                    setMenuOpen(false);
                    action.onPress();
                  }}
                  alignItems="center"
                  gap={10}
                  paddingVertical={10}
                  paddingHorizontal={12}
                  borderRadius={12}
                  pressStyle={PRESS_STYLE.row}
                >
                  <MaterialIcons
                    name={action.icon}
                    size={18}
                    color={action.active ? accent : ink}
                  />
                  <Text color="$color" fontSize={14} fontWeight="600">
                    {action.label}
                  </Text>
                </XStack>
              ))}
            </YStack>
          )}
        </YStack>
      )}
    </YStack>
  );
}
