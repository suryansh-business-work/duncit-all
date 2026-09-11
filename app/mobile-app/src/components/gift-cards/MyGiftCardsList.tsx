import { useState } from 'react';
import { Spinner, Text, YStack } from 'tamagui';

import { EmptyState } from '@/components/EmptyState';
import { SectionHeader } from '@/components/SectionHeader';
import type { MyGiftCards } from '@/hooks/useGiftCards';
import { useTranslation } from '@/hooks/useTranslation';
import { GiftCardRow } from './GiftCardRow';

/** How long the "copied" line stays up before it stops being news. */
const NOTICE_MS = 3000;

interface Props {
  cards: MyGiftCards | null;
  loading: boolean;
  error: boolean;
  currency: string;
  /** The signed-in user's name — the {sender} of the share message. */
  senderName: string;
}

/** The My cards tab: the caller's held cards, then the ones they gifted away,
 * with an empty state and the copy-notice flash (rule 27 twin). */
export function MyGiftCardsList({ cards, loading, error, currency, senderName }: Readonly<Props>) {
  const { t } = useTranslation();
  const [notice, setNotice] = useState<string | null>(null);

  const flash = (message: string) => {
    setNotice(message);
    globalThis.setTimeout(() => setNotice(null), NOTICE_MS);
  };

  if (error) {
    return (
      <Text testID="gift-cards-error" fontSize={13} color="$danger">
        {t('mweb.giftCards.loadError')}
      </Text>
    );
  }
  if (loading && !cards) {
    return (
      <YStack alignItems="center" paddingVertical={24}>
        <Spinner testID="gift-cards-loading" color="$primary" />
      </YStack>
    );
  }
  const owned = cards?.owned ?? [];
  const gifted = cards?.gifted ?? [];
  if (owned.length === 0 && gifted.length === 0) {
    return (
      <EmptyState
        testID="gift-cards-empty"
        icon="card-giftcard"
        title={t('mweb.giftCards.myCardsEmpty')}
      />
    );
  }

  return (
    <YStack gap={16}>
      {notice ? (
        <Text testID="gift-cards-notice" fontSize={13} fontWeight="600" color="$primary">
          {notice}
        </Text>
      ) : null}
      {owned.map((card) => (
        <GiftCardRow
          key={card.id}
          card={card}
          currency={currency}
          senderName={senderName}
          onNotice={flash}
        />
      ))}
      {gifted.length > 0 ? (
        <YStack gap={12}>
          <SectionHeader title={t('mweb.giftCards.giftedHeading')} />
          {gifted.map((card) => (
            <GiftCardRow
              key={card.id}
              card={card}
              currency={currency}
              senderName={senderName}
              showRecipient
              onNotice={flash}
            />
          ))}
        </YStack>
      ) : null}
    </YStack>
  );
}
