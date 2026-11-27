import type { ReactNode } from 'react';
import { Text, XStack, YStack } from 'tamagui';
import { CRM_DASH } from '@duncit/utils';

import { MOBILE } from '@/constants/design';
import { LinkText } from './LinkText';

/** A row's value: text or a number, a web link, or anything already drawn. */
export type RowValue = string | number | null | undefined | { href: string } | ReactNode;

const isLink = (value: unknown): value is { href: string } =>
  typeof value === 'object' && value !== null && 'href' in value;

/** Nothing to show: empty, missing, or already the dash. */
export const isEmptyValue = (value: RowValue): boolean =>
  value === '' || value === null || value === undefined || value === CRM_DASH;

function Value({ value }: Readonly<{ value: RowValue }>) {
  if (isEmptyValue(value)) return <Text color="$muted">{CRM_DASH}</Text>;
  if (typeof value === 'string' || typeof value === 'number')
    return <Text textAlign="right">{String(value)}</Text>;
  if (isLink(value)) return <LinkText href={value.href} />;
  return <>{value}</>;
}

/**
 * A detail as a phone lists it (Contacts, Settings): the label on the left in
 * the muted colour, the value on the right, one compact row, wrapping when
 * the value is long — instead of the portal's small-capitals label stacked
 * over its value, which made every lead page a long column.
 */
export function DetailRow({
  label,
  value,
  testID,
}: Readonly<{ label: string; value: RowValue; testID?: string }>) {
  return (
    <XStack
      minHeight={MOBILE.touch - 8}
      paddingVertical="$2"
      gap="$3"
      alignItems="center"
      borderBottomWidth={1}
      borderColor="$borderColor"
      testID={testID}
    >
      <Text flex={2} color="$muted">
        {label}
      </Text>
      <YStack flex={3} alignItems="flex-end">
        <Value value={value} />
      </YStack>
    </XStack>
  );
}
