import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack, useTheme } from 'tamagui';

import { SURFACE } from '@/components/surface';
import { waDisplayName, waNumberLine } from '@/features/whatsapp-generator/format';
import type { WaBrowserRow, WaGroupRef } from '@/features/whatsapp-generator/useWaBrowser';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  row: WaBrowserRow;
  onCommunity: (ref: WaGroupRef) => void;
  onGroup: (ref: WaGroupRef) => void;
}

/**
 * One browser row: a community (its group count; opens its groups), a group
 * (opens its members) or a user (name, number, business flag).
 */
export function BrowserRow({ row, onCommunity, onGroup }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  if (row.kind === 'user') {
    return (
      <YStack {...SURFACE} gap="$1" testID={`wa-row-${row.id}`}>
        <Text fontWeight="600">{waDisplayName(row.name, row.phone)}</Text>
        <Text color="$muted" fontSize="$2">
          {waNumberLine(t, row.phone, row.business)}
        </Text>
      </YStack>
    );
  }
  const ref = { jid: row.jid, name: row.name };
  const open = row.kind === 'community' ? onCommunity : onGroup;
  const subtitle =
    row.kind === 'community'
      ? t('crm.tools.groupsCount', { count: row.groups })
      : t('crm.tools.tapToViewMembers');
  return (
    <XStack
      role="button"
      aria-label={row.name}
      onPress={() => open(ref)}
      {...SURFACE}
      pressStyle={{ backgroundColor: '$soft' }}
      alignItems="center"
      gap="$2"
      testID={`wa-row-${row.id}`}
    >
      <YStack flex={1} gap="$1">
        <Text fontWeight="600">{row.name}</Text>
        <Text color="$muted" fontSize="$2">
          {subtitle}
        </Text>
      </YStack>
      <MaterialIcons name="chevron-right" size={22} color={theme.muted?.val} />
    </XStack>
  );
}
