import { useMemo, useState } from 'react';
import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { Input, Label, Text, XStack, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';

export interface ChoiceOption {
  value: string;
  label: string;
}

interface Props<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  options: ChoiceOption[];
  /** Multi-choice stores a list; single-choice a value ('' for none). */
  multiple?: boolean;
  /** Offered first, as "none" — single choice only. */
  noneLabel?: string;
  /** Long lists get a filter box. */
  searchLabel?: string;
  /** Called with the picked option (single choice), e.g. to store its name beside its id. */
  onPick?: (option: ChoiceOption | null) => void;
  testID?: string;
}

const SEARCH_FROM = 12;

/** Pick one (or several) of a short list as tappable chips, with the field error under them. */
export function ChoiceField<T extends FieldValues>({
  control,
  name,
  label,
  options,
  multiple,
  noneLabel,
  searchLabel,
  onPick,
  testID,
}: Readonly<Props<T>>) {
  const { field, fieldState } = useController({ control, name });
  const [filter, setFilter] = useState('');
  const picked: string[] = multiple
    ? ((field.value as string[] | undefined) ?? [])
    : [String(field.value ?? '')];
  const shown = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    return needle ? options.filter((o) => o.label.toLowerCase().includes(needle)) : options;
  }, [filter, options]);

  const toggle = (option: ChoiceOption) => {
    if (multiple) {
      field.onChange(
        picked.includes(option.value)
          ? picked.filter((v) => v !== option.value)
          : [...picked, option.value],
      );
      return;
    }
    field.onChange(option.value);
    onPick?.(option);
  };

  return (
    <YStack gap="$2">
      <Label fontWeight="600">{label}</Label>
      {searchLabel && options.length > SEARCH_FROM ? (
        <Input
          value={filter}
          onChangeText={setFilter}
          placeholder={searchLabel}
          aria-label={searchLabel}
          placeholderTextColor="$muted"
          borderColor="$inputBorder"
          testID={testID ? `${testID}-search` : undefined}
        />
      ) : null}
      <XStack flexWrap="wrap" gap="$2" role={multiple ? 'group' : 'radiogroup'} aria-label={label}>
        {noneLabel && !multiple ? (
          <DuncitButton
            label={noneLabel}
            onPress={() => {
              field.onChange('');
              onPick?.(null);
            }}
            size="sm"
            variant={picked[0] ? 'outline' : 'solid'}
            testID={testID ? `${testID}-none` : undefined}
          />
        ) : null}
        {shown.map((option) => (
          <DuncitButton
            key={option.value}
            label={option.label}
            onPress={() => toggle(option)}
            size="sm"
            variant={picked.includes(option.value) ? 'solid' : 'outline'}
            testID={testID ? `${testID}-${option.value}` : undefined}
          />
        ))}
      </XStack>
      {fieldState.error ? (
        <Text color="$danger" fontSize="$2" role="alert">
          {fieldState.error.message}
        </Text>
      ) : null}
    </YStack>
  );
}
