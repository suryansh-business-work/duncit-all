import { Text, XStack, YStack } from 'tamagui';
import { DYNAMIC_FIELD_APPLIES, DYNAMIC_FIELD_KIND_KEY } from '@duncit/forms/schemas';

import { IconAction } from '@/components/settings-editors/IconAction';
import { SURFACE } from '@/components/surface';
import { Toggle } from '@/components/Toggle';
import { ToneChip } from '@/components/ToneChip';
import type { DynamicFieldRecord } from '@/features/dynamic-fields/useDynamicFields';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  row: DynamicFieldRecord;
  index: number;
  count: number;
  /** A change is running: every action waits. */
  busy: boolean;
  onMove: (from: number, to: number) => void;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * One field as the portal's table row shows it: its label (Required, Multi),
 * hint, type and the lead kinds it applies to, the on/off switch, move up /
 * down, edit and delete.
 */
export function DynamicFieldRow({
  row,
  index,
  count,
  busy,
  onMove,
  onToggle,
  onEdit,
  onDelete,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const name = { vars: { name: row.label } };
  return (
    <YStack {...SURFACE} gap="$2" testID={`dynamic-field-${row.name}`}>
      <XStack alignItems="center" gap="$2">
        <YStack flex={1} gap="$1">
          <XStack alignItems="center" gap="$2" flexWrap="wrap">
            <Text fontWeight="600">{row.label}</Text>
            {row.required ? (
              <ToneChip label={t('crm.managedynamicfieldspage.required')} tone="warning" />
            ) : null}
            {row.kind === 'select' && row.multi ? (
              <ToneChip label={t('crm.managedynamicfieldspage.multi')} tone="default" />
            ) : null}
          </XStack>
          {row.hint ? (
            <Text color="$muted" fontSize="$2">
              {row.hint}
            </Text>
          ) : null}
          <Text color="$muted" fontSize="$2">
            {t(DYNAMIC_FIELD_KIND_KEY[row.kind])}
          </Text>
        </YStack>
        <Toggle
          checked={row.is_active}
          onChange={onToggle}
          disabled={busy}
          label={t('shell.a11y.fieldOf', {
            vars: { field: t('crm.common.active'), name: row.label },
          })}
          testID={`dynamic-field-active-${row.name}`}
        />
      </XStack>
      <XStack flexWrap="wrap" gap="$1.5" aria-label={t('crm.common.appliesTo')}>
        {DYNAMIC_FIELD_APPLIES.filter(({ flag }) => row[flag]).map(({ flag, chipKey }) => (
          <ToneChip key={flag} label={t(chipKey)} tone="info" />
        ))}
      </XStack>
      <XStack justifyContent="flex-end" gap="$1">
        <IconAction
          icon="arrow-upward"
          label={t('crm.a11y.moveUpNamed', name)}
          onPress={() => onMove(index, index - 1)}
          disabled={busy || index === 0}
          testID={`dynamic-field-up-${row.name}`}
        />
        <IconAction
          icon="arrow-downward"
          label={t('crm.a11y.moveDownNamed', name)}
          onPress={() => onMove(index, index + 1)}
          disabled={busy || index === count - 1}
          testID={`dynamic-field-down-${row.name}`}
        />
        <IconAction
          icon="edit"
          label={t('shell.a11y.editNamed', name)}
          onPress={onEdit}
          disabled={busy}
          testID={`dynamic-field-edit-${row.name}`}
        />
        <IconAction
          icon="delete"
          label={t('shell.a11y.deleteNamed', name)}
          onPress={onDelete}
          disabled={busy}
          danger
          testID={`dynamic-field-delete-${row.name}`}
        />
      </XStack>
    </YStack>
  );
}
