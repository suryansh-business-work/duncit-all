import type { ReactNode } from 'react';
import { Text, YStack } from 'tamagui';

import { MailPreferenceRow } from './MailPreferenceRow';
import type { MailPreferenceCategory } from '@/hooks/useMailPreferences';

interface Props {
  heading: string;
  hint?: string;
  items: MailPreferenceCategory[];
  busyCategory: string | null;
  onChange: (category: string, enabled: boolean) => void;
  /** The "unsubscribe from everything" action, under the rows. */
  footer?: ReactNode;
}

/**
 * One group of categories in a card — the ones you can switch off, or the ones
 * that always arrive. Tamagui twin of mWeb's MailPreferenceSection.
 */
export function MailPreferenceSection({
  heading,
  hint,
  items,
  busyCategory,
  onChange,
  footer,
}: Readonly<Props>) {
  if (items.length === 0) return null;

  return (
    <YStack
      borderRadius={18}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
      padding={16}
    >
      <Text fontSize={14} fontWeight="700" color="$color">
        {heading}
      </Text>
      {hint ? (
        <Text fontSize={12.5} color="$muted" paddingTop={4}>
          {hint}
        </Text>
      ) : null}

      <YStack paddingTop={4}>
        {items.map((item, index) => (
          <YStack key={item.category}>
            {index > 0 ? <YStack height={1} backgroundColor="$borderColor" /> : null}
            <MailPreferenceRow
              item={item}
              busy={busyCategory === item.category}
              onChange={onChange}
            />
          </YStack>
        ))}
      </YStack>

      {footer}
    </YStack>
  );
}
