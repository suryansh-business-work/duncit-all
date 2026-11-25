import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack, useTheme } from 'tamagui';
import { formatDate } from '@duncit/datetime';
import { crmServiceTargetLabelKeys } from '@duncit/utils';

import { SURFACE } from '@/components/surface';
import { ToneChip } from '@/components/ToneChip';
import type { ServiceOfferedRow } from '@/features/services-offered/serviceOffered';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  row: ServiceOfferedRow;
  onEdit: () => void;
  onDelete: () => void;
}

/** A level's name, or the table's dash when the service is not filed that deep. */
const orDash = (name: string | null | undefined, dash: string) => (name?.trim() ? name : dash);

/**
 * One service as the portal's table row shows it: the title, Active, its
 * Super → Category → Sub, the lead types it applies to and when it was added,
 * with edit and delete.
 */
export function ServiceOfferedCard({ row, onEdit, onDelete }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const dash = t('crmApp.common.dash');
  const targets = crmServiceTargetLabelKeys(row);
  const levels = [
    { key: 'super', label: t('crm.common.superCategory'), name: row.super_category_name },
    { key: 'category', label: t('crm.common.category'), name: row.category_name },
    { key: 'sub', label: t('crm.common.subCategory'), name: row.sub_category_name },
  ];
  const action = (icon: 'edit' | 'delete', label: string, onPress: () => void, color?: string) => (
    <XStack
      role="button"
      aria-label={label}
      onPress={onPress}
      padding="$2"
      hitSlop={6}
      testID={`service-${icon}-${row.id}`}
    >
      <MaterialIcons name={icon} size={20} color={color} />
    </XStack>
  );

  return (
    <YStack {...SURFACE} gap="$2" testID={`service-${row.id}`}>
      <XStack alignItems="center" gap="$2">
        <Text flex={1} fontWeight="700">
          {row.title}
        </Text>
        <ToneChip
          label={row.is_active ? t('crm.common.active') : t('crm.common.inactive')}
          tone={row.is_active ? 'success' : 'default'}
        />
        {action(
          'edit',
          t('crm.common.editNamed', { vars: { name: row.title } }),
          onEdit,
          theme.accentText?.val,
        )}
        {action(
          'delete',
          t('crm.common.deleteNamed', { vars: { name: row.title } }),
          onDelete,
          theme.danger?.val,
        )}
      </XStack>
      <XStack gap="$3">
        {levels.map((level) => (
          <YStack key={level.key} flex={1} gap="$1">
            <Text color="$muted" fontSize="$1">
              {level.label}
            </Text>
            <Text fontSize="$2">{orDash(level.name, dash)}</Text>
          </YStack>
        ))}
      </XStack>
      <XStack alignItems="center" gap="$2" flexWrap="wrap">
        <Text color="$muted" fontSize="$2">
          {t('crm.common.appliesTo')}
        </Text>
        {targets.length === 0 ? <Text fontSize="$2">{dash}</Text> : null}
        {targets.map((key) => (
          <ToneChip key={key} label={t(key)} tone="info" />
        ))}
      </XStack>
      {row.created_at ? (
        <Text color="$muted" fontSize="$2">
          {t('shell.a11y.fieldOf', {
            vars: { field: t('shell.common.created'), name: formatDate(row.created_at) },
          })}
        </Text>
      ) : null}
    </YStack>
  );
}
