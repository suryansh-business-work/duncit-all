import { Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { SurfaceCard } from '@/components/SurfaceCard';
import { GiftCardStatus } from '@/generated/graphql/graphql';
import type { GiftCard } from '@/hooks/useGiftCards';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { formatMoney } from '@/utils/checkout-math';
import { formatDate } from '@/utils/date-format';
import { GIFT_CARD_STATUS_KEYS, giftCardShareLink } from '@/utils/gift-cards';
import { shareUrl } from '@/services/share-link';
import { GiftCardVisual } from './GiftCardVisual';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  card: GiftCard;
  currency: string;
  /** The signed-in user's name — the {sender} of the share message. */
  senderName: string;
  /** Shown under gifted cards so the buyer sees where each one went. */
  showRecipient?: boolean;
  onNotice: (message: string) => void;
}

/** Status → the text colour of its soft pill (the fill is always `$soft`). */
const STATUS_TONE: Record<GiftCardStatus, string> = {
  [GiftCardStatus.Active]: '$success',
  [GiftCardStatus.Redeemed]: '$muted',
  [GiftCardStatus.Expired]: '$warning',
};

/** A 36px round soft icon button (copy / share). */
function RoundAction({
  testID,
  label,
  icon,
  onPress,
}: Readonly<{
  testID: string;
  label: string;
  icon: 'content-copy' | 'share';
  onPress: () => void;
}>) {
  const { color: ink } = useThemeColors();
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={label}
      onPress={onPress}
      width={36}
      height={36}
      alignItems="center"
      justifyContent="center"
      borderRadius={999}
      backgroundColor="$soft"
      pressStyle={PRESS_STYLE.control}
    >
      <MaterialIcons name={icon} size={18} color={ink} />
    </XStack>
  );
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
    <SurfaceCard testID={`gift-card-row-${card.id}`} padding={12} gap={12}>
      <GiftCardVisual
        theme={card}
        imageUrl={card.scope_image_url}
        artworkFrontUrl={card.scope_image_front_url}
        artworkBackUrl={card.scope_image_back_url}
        amountLabel={formatMoney(currency, card.initial_amount)}
        code={card.code}
      />
      <XStack alignItems="center" gap={8} paddingHorizontal={4}>
        <XStack
          height={24}
          paddingHorizontal={10}
          alignItems="center"
          borderRadius={999}
          backgroundColor="$soft"
        >
          <Text fontSize={12} fontWeight="600" color={STATUS_TONE[card.status]}>
            {statusLabel}
          </Text>
        </XStack>
        <Text flex={1} fontSize={12} color="$muted" numberOfLines={1}>
          {t('mweb.giftCards.validUntil', { vars: { date: formatDate(card.expires_at) } })}
        </Text>
        <RoundAction
          testID={`gift-card-copy-${card.id}`}
          label={copyLabel}
          icon="content-copy"
          onPress={copy}
        />
        <RoundAction
          testID={`gift-card-share-${card.id}`}
          label={shareLabel}
          icon="share"
          onPress={share}
        />
      </XStack>
      {showRecipient && card.recipient_email ? (
        <Text paddingHorizontal={4} fontSize={12} color="$muted" numberOfLines={1}>
          {card.recipient_name || card.recipient_email}
        </Text>
      ) : null}
    </SurfaceCard>
  );
}
