import { useState } from 'react';
import { Text, XStack, YStack } from 'tamagui';
import type { CrmImportField } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { SelectChip } from '@/components/mobile/SelectChip';
import { SURFACE } from '@/components/surface';
import { ToneChip } from '@/components/ToneChip';
import { useTranslation } from '@/hooks/useTranslation';

/** The "ignore this field" choice's key and test id (its value is the empty column). */
const IGNORE_ID = 'ignore';

interface Props {
  fields: readonly CrmImportField[];
  headers: readonly string[];
  mapping: Readonly<Record<string, string>>;
  onChange: (field: string, header: string) => void;
}

/** One lead field and the spreadsheet column it takes; tap to choose the column (or ignore the field). */
function FieldRow({
  field,
  headers,
  value,
  onChange,
}: Readonly<{
  field: CrmImportField;
  headers: readonly string[];
  value: string;
  onChange: (header: string) => void;
}>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ignore = t('crm.excelImport.ignore');
  const pick = (header: string) => {
    onChange(header);
    setOpen(false);
  };
  return (
    <YStack
      {...SURFACE}
      gap="$2"
      borderColor={field.required && !value ? '$danger' : SURFACE.borderColor}
      testID={`import-field-${field.field}`}
    >
      <XStack alignItems="center" gap="$2">
        <Text flex={1} fontWeight="600">
          {field.label}
        </Text>
        {field.required ? <ToneChip label={t('crm.excelImport.required')} tone="error" /> : null}
      </XStack>
      <DuncitButton
        label={value || ignore}
        accessibilityLabel={`${value || ignore}, ${field.label}`}
        onPress={() => setOpen((current) => !current)}
        variant="outline"
        size="sm"
        testID={`import-field-${field.field}-pick`}
      />
      {open ? (
        <XStack flexWrap="wrap" gap="$2" role="radiogroup" aria-label={field.label}>
          {['', ...headers].map((header) => {
            const choice = header || IGNORE_ID;
            return (
              <SelectChip
                key={choice}
                label={header || ignore}
                onPress={() => pick(header)}
                selected={header === value}
                testID={`import-field-${field.field}-${choice}`}
              />
            );
          })}
        </XStack>
      ) : null}
    </YStack>
  );
}

/** Excel import › match each lead field to a column of the file (the portal's ColumnMappingStep). */
export function LeadListImportMapping({ fields, headers, mapping, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <YStack gap="$2">
      <Text color="$muted">{t('crm.excelImport.mappingIntro')}</Text>
      {fields.map((field) => (
        <FieldRow
          key={field.field}
          field={field}
          headers={headers}
          value={mapping[field.field] ?? ''}
          onChange={(header) => onChange(field.field, header)}
        />
      ))}
    </YStack>
  );
}
