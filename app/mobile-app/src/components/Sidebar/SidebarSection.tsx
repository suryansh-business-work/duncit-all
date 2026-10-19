import { Children, Fragment, isValidElement, useState, type ReactNode } from 'react';
import { LayoutAnimation } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Separator, Text, XStack, YStack } from 'tamagui';

import { SurfaceCard } from '@/components/SurfaceCard';
import { useThemeColors } from '@/hooks/useThemeColors';
import { PRESS_STYLE } from '@duncit/buttons-native';
import type { IconName } from './profileSections';

/**
 * One collapsible section card of the menu: a rounded icon tile, the bold
 * title and a one-line muted subtitle naming what is inside, with a chevron
 * that turns as it opens. Collapsed by default; opened, its rows sit under a
 * hairline in the same card. mWeb twin: profile-drawer/MenuSection.
 */
export function SidebarSection({
  id,
  icon,
  title,
  subtitle,
  children,
}: Readonly<{ id: string; icon: IconName; title: string; subtitle: string; children: ReactNode }>) {
  const { accent, muted } = useThemeColors();
  const [open, setOpen] = useState(false);
  const rows = Children.toArray(children).filter(isValidElement);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((v) => !v);
  };

  return (
    <YStack paddingHorizontal={16} paddingBottom={12}>
      <SurfaceCard padding={0} overflow="hidden" testID={`sidebar-section-${id}`}>
        <XStack
          testID={`sidebar-section-${id}-toggle`}
          role="button"
          aria-label={title}
          accessibilityHint={subtitle}
          aria-expanded={open}
          accessibilityState={{ expanded: open }}
          tabIndex={0}
          onPress={toggle}
          alignItems="center"
          gap={12}
          minHeight={68}
          paddingHorizontal={16}
          paddingVertical={12}
          pressStyle={PRESS_STYLE.row}
        >
          <YStack
            width={40}
            height={40}
            borderRadius={12}
            alignItems="center"
            justifyContent="center"
            backgroundColor="$soft"
          >
            <MaterialIcons name={icon} size={22} color={accent} />
          </YStack>
          <YStack flex={1} minWidth={0} gap={2}>
            <Text numberOfLines={1} fontSize={15} fontWeight="700" color="$color">
              {title}
            </Text>
            <Text
              testID={`sidebar-section-${id}-subtitle`}
              numberOfLines={1}
              fontSize={12}
              color="$muted"
            >
              {subtitle}
            </Text>
          </YStack>
          <YStack rotate={open ? '90deg' : '0deg'}>
            <MaterialIcons name="chevron-right" size={22} color={muted} />
          </YStack>
        </XStack>
        {open
          ? rows.map((row) => (
              <Fragment key={row.key}>
                <Separator borderColor="$borderColor" marginHorizontal={16} />
                {row}
              </Fragment>
            ))
          : null}
      </SurfaceCard>
    </YStack>
  );
}
