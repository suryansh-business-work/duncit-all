import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack, useTheme } from 'tamagui';

import { RADII } from '@/constants/design';
import { useTranslation } from '@/hooks/useTranslation';
import type { NavIcon, NavItem } from '@/navigation/crmNav';

const ICON_SIZE = 22;
/** How far each level of the tree steps in, as the portal's sidebar nests its groups. */
const INDENT = 14;

function Icon({ icon, color }: Readonly<{ icon: NavIcon; color: string | undefined }>) {
  return icon.set === 'community' ? (
    <MaterialCommunityIcons
      name={icon.name}
      size={ICON_SIZE}
      color={color}
      accessibilityElementsHidden
    />
  ) : (
    <MaterialIcons name={icon.name} size={ICON_SIZE} color={color} accessibilityElementsHidden />
  );
}

interface TreeProps {
  items: readonly NavItem[];
  /** The item the person is on now. */
  activeKey: string | null;
  /** Which groups are open. */
  expanded: ReadonlySet<string>;
  onToggle: (key: string) => void;
  onPick: (item: NavItem) => void;
  depth?: number;
}

/**
 * The portal sidebar as a tree: a group opens and closes in place (chevron),
 * an item goes where it points. The current item is marked the way the portal
 * marks it — the accent's soft fill behind accent-coloured text.
 */
export function NavTree({
  items,
  activeKey,
  expanded,
  onToggle,
  onPick,
  depth = 0,
}: Readonly<TreeProps>) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <YStack gap="$1">
      {items.map((item) => {
        const group = Boolean(item.children?.length);
        const open = group && expanded.has(item.key);
        const active = item.key === activeKey;
        return (
          <YStack key={item.key} gap="$1">
            <XStack
              role="button"
              aria-label={t(item.labelKey)}
              aria-expanded={group ? open : undefined}
              aria-selected={active}
              onPress={() => (group ? onToggle(item.key) : onPick(item))}
              alignItems="center"
              gap="$3"
              minHeight={48}
              paddingVertical="$2"
              paddingRight="$3"
              paddingLeft={12 + depth * INDENT}
              borderRadius={RADII.sm}
              backgroundColor={active ? '$navSelected' : 'transparent'}
              pressStyle={{ backgroundColor: active ? '$navSelected' : '$hover' }}
              testID={`nav-${item.key}`}
            >
              <Icon icon={item.icon} color={active ? theme.accentText?.val : theme.muted?.val} />
              <Text flex={1} color="$color" fontWeight={active ? '600' : '500'}>
                {t(item.labelKey)}
              </Text>
              {group ? (
                <MaterialIcons
                  name={open ? 'expand-less' : 'expand-more'}
                  size={22}
                  color={theme.muted?.val}
                />
              ) : null}
            </XStack>
            {open && item.children ? (
              <NavTree
                items={item.children}
                activeKey={activeKey}
                expanded={expanded}
                onToggle={onToggle}
                onPick={onPick}
                depth={depth + 1}
              />
            ) : null}
          </YStack>
        );
      })}
    </YStack>
  );
}
