import { useState } from 'react';
import { LayoutAnimation } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';

interface PolicyLink {
  id: string;
  slug: string;
  title: string;
}

/** Collapsible "Policies" group — RN port of mWeb's <PoliciesSection/>. */
export function SidebarPolicies({
  policies,
  onSelect,
}: {
  policies: PolicyLink[];
  onSelect: (slug: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const { muted } = useThemeColors();

  if (policies.length === 0) return null;

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((v) => !v);
  };

  return (
    <YStack testID="sidebar-policies">
      <XStack
        accessibilityRole="button"
        accessibilityLabel="Policies"
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
        <Text flex={1} fontSize={14} fontWeight="800" color="$color">
          Policies
        </Text>
        <MaterialIcons name={open ? 'expand-less' : 'expand-more'} size={20} color={muted} />
      </XStack>
      {open
        ? policies.map((p) => (
            <XStack
              key={p.id}
              testID={`sidebar-policy-${p.slug}`}
              accessibilityRole="button"
              accessibilityLabel={p.title}
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
