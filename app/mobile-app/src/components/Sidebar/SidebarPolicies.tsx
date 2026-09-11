import { useState } from 'react';
import { LayoutAnimation } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Separator, Text, XStack, YStack } from 'tamagui';

import { Skeleton } from '@/components/Skeleton';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { SidebarRow } from './SidebarRow';

interface PolicyLink {
  id: string;
  slug: string;
  title: string;
}

/** Collapsible "Policies" row of the menu's settings group — RN port of mWeb's
 * <PoliciesSection/>. Opened, each policy is an inset row under it. */
export function SidebarPolicies({
  policies,
  loading = false,
  onSelect,
}: Readonly<{
  policies: PolicyLink[];
  /** The links are still in flight — hold the row rather than popping it in. */
  loading?: boolean;
  onSelect: (slug: string) => void;
}>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { muted } = useThemeColors();

  if (loading) {
    return (
      <XStack
        testID="sidebar-policies-skeleton"
        alignItems="center"
        gap={12}
        minHeight={60}
        paddingHorizontal={16}
      >
        <Skeleton width={36} height={36} radius={18} />
        <Skeleton width="40%" height={14} />
      </XStack>
    );
  }
  if (policies.length === 0) return null;

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((v) => !v);
  };

  return (
    <YStack testID="sidebar-policies">
      <SidebarRow
        icon="description"
        label={t('mweb.common.policies')}
        onPress={toggle}
        chevron={false}
        trailing={
          <MaterialIcons name={open ? 'expand-less' : 'expand-more'} size={22} color={muted} />
        }
      />
      {open
        ? policies.map((p) => (
            <YStack key={p.id}>
              <Separator borderColor="$borderColor" marginLeft={64} marginRight={16} />
              <XStack
                pressStyle={PRESS_STYLE.row}
                testID={`sidebar-policy-${p.slug}`}
                role="button"
                aria-label={p.title}
                onPress={() => onSelect(p.slug)}
                alignItems="center"
                gap={10}
                minHeight={48}
                paddingLeft={64}
                paddingRight={16}
              >
                <MaterialIcons name="article" size={18} color={muted} />
                <Text flex={1} fontSize={14} fontWeight="500" color="$color">
                  {p.title}
                </Text>
              </XStack>
            </YStack>
          ))
        : null}
    </YStack>
  );
}
