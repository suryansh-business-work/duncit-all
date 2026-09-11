import type { ReactNode } from 'react';
import { Text, YStack } from 'tamagui';

import { SurfaceCard } from '@/components/SurfaceCard';
import { WhatsAppPreferenceRow } from './WhatsAppPreferenceRow';
import type { WhatsAppPreferenceCategory } from '@/hooks/useWhatsAppPreferences';

interface Props {
  heading: string;
  hint?: string;
  items: WhatsAppPreferenceCategory[];
  busyCategory: string | null;
  onChange: (category: string, enabled: boolean) => void;
  /** The "turn off everything optional" action, under the rows. */
  footer?: ReactNode;
}

/**
 * One group of categories in a card — the ones you can switch off, or the ones
 * that always arrive. Tamagui twin of mWeb's WhatsAppPreferenceSection.
 */
export function WhatsAppPreferenceSection({
  heading,
  hint,
  items,
  busyCategory,
  onChange,
  footer,
}: Readonly<Props>) {
  if (items.length === 0) return null;

  return (
    <SurfaceCard>
      <Text accessibilityRole="header" fontSize={17} fontWeight="600" color="$color">
        {heading}
      </Text>
      {hint ? (
        <Text fontSize={14} color="$muted" paddingTop={4}>
          {hint}
        </Text>
      ) : null}

      <YStack paddingTop={4}>
        {items.map((item, index) => (
          <YStack key={item.category}>
            {index > 0 ? <YStack height={1} backgroundColor="$borderColor" /> : null}
            <WhatsAppPreferenceRow
              item={item}
              busy={busyCategory === item.category}
              onChange={onChange}
            />
          </YStack>
        ))}
      </YStack>

      {footer}
    </SurfaceCard>
  );
}
