import { Text, XStack, YStack } from 'tamagui';
import { formatDate } from '@duncit/datetime';

import { IconButton } from '@/components/email-templates/IconButton';
import { SURFACE } from '@/components/surface';
import { ToneChip } from '@/components/ToneChip';
import { targetLabel } from '@/features/email-templates/targets';
import { useTranslation } from '@/hooks/useTranslation';

export interface TemplateRowData {
  template_id: string;
  slug: string;
  name: string;
  subject: string;
  target: string;
  is_active: boolean;
  updated_at?: string | null;
}

interface Props {
  row: TemplateRowData;
  onOpen: () => void;
  onDelete: () => void;
}

/** One template as the portal's table row shows it: name, slug, audience, subject, Active and when it changed. */
export function TemplateRow({ row, onOpen, onDelete }: Readonly<Props>) {
  const { t } = useTranslation();
  const updated = row.updated_at ? formatDate(row.updated_at) : '';
  return (
    <XStack
      {...SURFACE}
      role="button"
      aria-label={t('crm.common.editNamed', { vars: { name: row.name } })}
      onPress={onOpen}
      pressStyle={{ backgroundColor: '$soft' }}
      gap="$2"
      alignItems="flex-start"
      testID={`template-row-${row.template_id}`}
    >
      <YStack flex={1} gap="$1">
        <XStack alignItems="center" gap="$2">
          <Text flex={1} fontWeight="700" numberOfLines={1}>
            {row.name}
          </Text>
          <ToneChip
            label={row.is_active ? t('crm.common.active') : t('crm.common.inactive')}
            tone={row.is_active ? 'success' : 'default'}
          />
        </XStack>
        <Text color="$muted" fontSize="$2" numberOfLines={1}>
          {row.slug}
        </Text>
        <Text numberOfLines={2}>{row.subject}</Text>
        <XStack alignItems="center" gap="$2" flexWrap="wrap">
          <ToneChip label={targetLabel(t, row.target)} tone="info" />
          {updated ? (
            <Text color="$muted" fontSize="$2">
              {`${t('shell.common.updated')} ${updated}`}
            </Text>
          ) : null}
        </XStack>
      </YStack>
      <IconButton
        icon="delete-outline"
        tone="danger"
        label={t('crm.common.deleteNamed', { vars: { name: row.name } })}
        onPress={onDelete}
        testID={`template-delete-${row.template_id}`}
      />
    </XStack>
  );
}
