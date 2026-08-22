import { Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import type { GiftCard } from '@/hooks/useGiftCards';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { formatMoney } from '@/utils/checkout-math';
import { formatDate } from '@/utils/date-format';
import { GIFT_CARD_STATUS_KEYS, giftCardShareLink } from '@/utils/gift-cards';
import { shareUrl } from '@/services/share-link';
import { GiftCardVisual } from './GiftCardVisual';

interface Props {
  card: GiftCard;
  currency: string;
  /** The signed-in user's name — the {sender} of the share message. */
  senderName: string;
  /** Shown under gifted cards so the buyer sees where each one went. */
  showRecipient?: boolean;
  onNotice: (message: string) => void;
}

/** One card in My cards: the visual with its code, status + validity, and the
 * copy/share actions. The link is the mWeb claim page (rule 27). */
export function GiftCardRow({
  card,
  currency,
  senderName,
  showRecipient = false,
  onNotice,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { color: ink } = useThemeColors();
  const copyLabel = t('mweb.giftCards.copyCode');
  const shareLabel = t('mweb.giftCards.shareCard');
  const statusLabel = t(GIFT_CARD_STATUS_KEYS[card.status]);

  const copy = () => {
    Clipboard.setStringAsync(card.code)
      .then(() => onNotice(t('mweb.giftCards.codeCopied')))
      .catch(() => undefined);
  };

  const share = async () => {
    const intro = t('mweb.giftCards.shareMessage', {
      vars: { sender: senderName, amount: formatMoney(currency, card.initial_amount) },
    });
    const url = await shareUrl('GIFT_CARD', card.code, giftCardShareLink(card.code));
    Share.share({ message: `${intro} ${url}` }).catch(() => undefined);
  };

  return (
    <YStack testID={`gift-card-row-${card.id}`} gap={8}>
      <GiftCardVisual
        theme={card}
        imageUrl={card.scope_image_url}
        artworkFrontUrl={card.scope_image_front_url}
        artworkBackUrl={card.scope_image_back_url}
        amountLabel={formatMoney(currency, card.initial_amount)}
        code={card.code}
      />
      <XStack alignItems="center" gap={8} flexWrap="wrap">
        <Text
          fontSize={10.5}
          fontWeight="700"
          textTransform="uppercase"
          letterSpacing={0.3}
          color="$primary"
          borderWidth={1}
          borderColor="$primary"
          borderRadius={999}
          paddingHorizontal={7}
          paddingVertical={2}
        >
          {statusLabel}
        </Text>
        <Text flex={1} fontSize={12} color="$muted">
          {t('mweb.giftCards.validUntil', { vars: { date: formatDate(card.expires_at) } })}
        </Text>
        <XStack
          testID={`gift-card-copy-${card.id}`}
          role="button"
          aria-label={copyLabel}
          onPress={copy}
          alignItems="center"
          gap={4}
          pressStyle={{ opacity: 0.7 }}
        >
          <MaterialIcons name="content-copy" size={15} color={ink} />
          <Text fontSize={12.5} fontWeight="700" color="$color">
            {copyLabel}
          </Text>
        </XStack>
        <XStack
          testID={`gift-card-share-${card.id}`}
          role="button"
          aria-label={shareLabel}
          onPress={share}
          alignItems="center"
          gap={4}
          pressStyle={{ opacity: 0.7 }}
        >
          <MaterialIcons name="share" size={15} color={ink} />
          <Text fontSize={12.5} fontWeight="700" color="$color">
            {shareLabel}
          </Text>
        </XStack>
      </XStack>
      {showRecipient && card.recipient_email ? (
        <Text fontSize={12} color="$muted" numberOfLines={1}>
          {card.recipient_name || card.recipient_email}
        </Text>
      ) : null}
    </YStack>
  );
}
