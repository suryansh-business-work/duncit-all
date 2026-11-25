import { Input, Label, Text, YStack } from 'tamagui';
import type { CrmAiLeadEntity, CrmAiRow } from '@duncit/utils';

import { SURFACE } from '@/components/surface';
import { useTranslation } from '@/hooks/useTranslation';

type EditableField =
  'name' | 'city' | 'full_address' | 'mobile' | 'email' | 'lead_status' | 'priority';

interface Props {
  entity: CrmAiLeadEntity;
  row: CrmAiRow;
  onChange: (id: number, patch: Partial<CrmAiRow>) => void;
}

/** One AI-read lead to check before saving — the portal's editable grid row as a card; a row that failed is red. */
export function LeadListAiRowCard({ entity, row, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const fields: { name: EditableField; label: string; keyboard?: 'phone-pad' | 'email-address' }[] =
    [
      {
        name: 'name',
        label: entity === 'VENUE_LEAD' ? t('crm.forms.venueName') : t('crm.forms.hostName'),
      },
      { name: 'city', label: t('crm.common.city') },
      ...(entity === 'VENUE_LEAD'
        ? [{ name: 'full_address' as const, label: t('crm.common.address') }]
        : []),
      { name: 'mobile', label: t('crm.components.mobile'), keyboard: 'phone-pad' as const },
      { name: 'email', label: t('shell.common.email'), keyboard: 'email-address' as const },
      { name: 'lead_status', label: t('shell.common.status') },
      { name: 'priority', label: t('crm.common.priority') },
    ];
  return (
    <YStack
      {...SURFACE}
      gap="$2"
      borderColor={row._error ? '$danger' : SURFACE.borderColor}
      backgroundColor={row._error ? '$dangerSoft' : SURFACE.backgroundColor}
      testID={`ai-row-${row._id}`}
    >
      {fields.map((field) => {
        const id = `ai-row-${row._id}-${field.name}`;
        return (
          <YStack key={field.name} gap="$1">
            <Label htmlFor={id} fontSize="$2" fontWeight="600">
              {field.label}
            </Label>
            <Input
              id={id}
              value={row[field.name]}
              onChangeText={(text) => onChange(row._id, { [field.name]: text })}
              keyboardType={field.keyboard ?? 'default'}
              autoCapitalize={field.keyboard ? 'none' : 'sentences'}
              aria-label={field.label}
              placeholderTextColor="$muted"
              borderColor="$inputBorder"
              testID={id}
            />
          </YStack>
        );
      })}
      {row._error ? (
        <Text color="$danger" role="alert" testID={`ai-row-${row._id}-error`}>
          {`${t('crm.components.issue')}: ${row._error}`}
        </Text>
      ) : null}
    </YStack>
  );
}
