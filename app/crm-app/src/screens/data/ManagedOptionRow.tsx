import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack, useTheme } from 'tamagui';

import { Toggle } from '@/components/Toggle';
import { SURFACE } from '@/components/surface';
import { ToneChip } from '@/components/ToneChip';
import type { ManagedOption } from '@/features/data/useManagedOptions';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  row: ManagedOption;
  busy: boolean;
  /** Edit and delete wait while another entry is being edited. */
  locked: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

/** One entry: its place and name (Inactive when switched off), the on/off switch, edit and delete. */
export function ManagedOptionRow({
  row,
  busy,
  locked,
  onToggle,
  onEdit,
  onDelete,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const action = (
    icon: 'edit' | 'delete',
    label: string,
    onPress: () => void,
    color: string | undefined,
  ) => (
    <XStack
      role="button"
      aria-label={label}
      aria-disabled={locked}
      onPress={locked ? undefined : onPress}
      opacity={locked ? 0.4 : 1}
      padding="$2"
      hitSlop={6}
      testID={`option-${icon}-${row.id}`}
    >
      <MaterialIcons name={icon} size={20} color={color} />
    </XStack>
  );
  return (
    <XStack {...SURFACE} alignItems="center" gap="$2" testID={`option-${row.id}`}>
      <YStack flex={1} gap="$1">
        <XStack alignItems="center" gap="$2" flexWrap="wrap">
          <Text fontWeight="600">{row.name}</Text>
          {row.is_active ? null : <ToneChip label={t('crm.common.inactive')} tone="warning" />}
        </XStack>
        <Text color="$muted" fontSize="$2">
          {t('crm.data.optionOrder', { vars: { order: row.sort_order } })}
        </Text>
      </YStack>
      <Toggle
        checked={row.is_active}
        onChange={onToggle}
        disabled={busy}
        label={t('shell.a11y.fieldOf', {
          vars: { field: t('crm.common.active'), name: row.name },
        })}
        testID={`option-active-${row.id}`}
      />
      {action(
        'edit',
        t('shell.a11y.editNamed', { vars: { name: row.name } }),
        onEdit,
        theme.accentText?.val,
      )}
      {action(
        'delete',
        t('shell.a11y.deleteNamed', { vars: { name: row.name } }),
        onDelete,
        theme.danger?.val,
      )}
    </XStack>
  );
}
