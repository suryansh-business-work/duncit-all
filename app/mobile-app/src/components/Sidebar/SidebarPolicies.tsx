import { useState } from 'react';
import { LayoutAnimation } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { Skeleton } from '@/components/Skeleton';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface PolicyLink {
  id: string;
  slug: string;
  title: string;
}

/** Collapsible "Policies" group — RN port of mWeb's <PoliciesSection/>. */
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
        marginHorizontal={8}
        marginVertical={2}
        paddingHorizontal={12}
        paddingVertical={18}
      >
        <Skeleton width={24} height={24} radius={12} />
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
      <XStack
        pressStyle={PRESS_STYLE.surface}
        role="button"
        aria-label={t('mweb.common.policies')}
        onPress={toggle}
        marginHorizontal={8}
        marginVertical={2}
        alignItems="center"
        gap={12}
        borderRadius={10}
        paddingHorizontal={12}
        paddingVertical={12}
      >
        <MaterialIcons name="description" size={20} color={muted} />
        <Text flex={1} fontSize={14} fontWeight="600" color="$color">
          Policies
        </Text>
        <MaterialIcons name={open ? 'expand-less' : 'expand-more'} size={20} color={muted} />
      </XStack>
      {open
        ? policies.map((p) => (
            <XStack
              pressStyle={PRESS_STYLE.surface}
              key={p.id}
              testID={`sidebar-policy-${p.slug}`}
              role="button"
              aria-label={p.title}
              onPress={() => onSelect(p.slug)}
              marginHorizontal={8}
              alignItems="center"
              gap={8}
              borderRadius={10}
              paddingVertical={8}
              paddingLeft={48}
              paddingRight={12}
            >
              <MaterialIcons name="article" size={16} color={muted} />
              <Text fontSize={13} fontWeight="600" color="$muted">
                {p.title}
              </Text>
            </XStack>
          ))
        : null}
    </YStack>
  );
}
