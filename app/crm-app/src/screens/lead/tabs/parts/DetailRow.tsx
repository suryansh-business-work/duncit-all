import type { ReactNode } from 'react';
import { Text, YStack } from 'tamagui';
import { CRM_DASH } from '@duncit/utils';

import { LinkText } from './LinkText';

/** A row's value: text or a number, a web link, or anything already drawn. */
export type RowValue = string | number | null | undefined | { href: string } | ReactNode;

const isLink = (value: unknown): value is { href: string } =>
  typeof value === 'object' && value !== null && 'href' in value;

function Value({ value }: Readonly<{ value: RowValue }>) {
  if (value === '' || value === null || value === undefined) return <Text>{CRM_DASH}</Text>;
  if (typeof value === 'string' || typeof value === 'number') return <Text>{String(value)}</Text>;
  if (isLink(value)) return <LinkText href={value.href} />;
  return <>{value}</>;
}

/** The portal's LeadDetailRow on a phone: the label in small capitals above its value, a dash when empty. */
export function DetailRow({
  label,
  value,
  testID,
}: Readonly<{ label: string; value?: RowValue; testID?: string }>) {
  return (
    <YStack paddingVertical="$1.5" gap="$0.5" testID={testID}>
      <Text
        color="$muted"
        fontSize="$1"
        fontWeight="700"
        letterSpacing={0.3}
        textTransform="uppercase"
      >
        {label}
      </Text>
      <Value value={value} />
    </YStack>
  );
}
