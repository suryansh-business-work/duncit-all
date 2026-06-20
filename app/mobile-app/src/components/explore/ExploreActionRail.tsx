import { useState } from 'react';
import type { ComponentProps } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { ExploreActionButton } from '@/components/explore/ExploreActionButton';
import { railLayout } from '@/utils/explore-rail';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

export interface ExploreRailAction {
  key: string;
  icon: IconName;
  label: string;
  onPress: () => void;
  active?: boolean;
  loading?: boolean;
  testID?: string;
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
          active={action.active}
          loading={action.loading}
          onPress={action.onPress}
        />
      ))}
      {overflow && (
        <YStack alignItems="center">
          <ExploreActionButton
            testID="reel-more"
            icon="more-vert"
            label="More"
            onPress={() => setMenuOpen((open) => !open)}
          />
          {menuOpen && (
            <YStack
              testID="reel-more-menu"
              position="absolute"
              right={54}
              bottom={0}
              backgroundColor="rgba(0,0,0,0.92)"
              borderRadius={12}
              padding={6}
              gap={2}
              minWidth={150}
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
                  paddingVertical={8}
                  paddingHorizontal={10}
                  pressStyle={{ opacity: 0.7 }}
                >
                  <MaterialIcons name={action.icon} size={18} color="#ffffff" />
                  <Text color="#ffffff" fontSize={13} fontWeight="800">
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
