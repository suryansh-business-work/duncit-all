import { Box, Chip, IconButton, Stack, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ShareIcon from '@mui/icons-material/Share';
import { formatMoney } from '@duncit/utils';
import { notifySuccess } from '../../components/notify';
import { useTranslation } from '../../i18n/useTranslation';
import { useDateFormat } from '../../utils/dateFormat';
import { shareUrl } from '../../lib/share-link';
import GiftCardVisual from './GiftCardVisual';
import type { GiftCard, GiftCardStatus } from './queries';

/** Status → chip copy, literal keys in a shared map (rule 38). */
const STATUS_KEY: Record<GiftCardStatus, string> = {
  ACTIVE: 'mweb.giftCards.statusActive',
  REDEEMED: 'mweb.giftCards.statusRedeemed',
  EXPIRED: 'mweb.giftCards.statusExpired',
};

const STATUS_COLOR: Record<GiftCardStatus, 'success' | 'default' | 'warning'> = {
  ACTIVE: 'success',
  REDEEMED: 'default',
  EXPIRED: 'warning',
};

interface MyCardTileProps {
  card: GiftCard;
  currencySymbol: string;
  /** The holder's own name — the share message says who the card is from. */
  senderName: string;
  /** Gifted-away cards also say who they went to. */
  showRecipient?: boolean;
}

/** One card in My cards: the visual (with its code), status, validity, and the
 * copy-code / share actions. A card is a bearer instrument — sharing the link
 * IS handing over the value. */
export default function MyCardTile({ card, currencySymbol, senderName, showRecipient = false }: Readonly<MyCardTileProps>) {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(card.code);
      notifySuccess(t('mweb.giftCards.codeCopied'));
    } catch {
      /* clipboard unavailable */
    }
  };

  const shareCard = async () => {
    const url = await shareUrl(
      'GIFT_CARD',
      card.code,
      `${globalThis.window.location.origin}/gift-card/${card.code}`,
    );
    const text = t('mweb.giftCards.shareMessage', {
      vars: { sender: senderName, amount: formatMoney(card.initial_amount, { symbol: currencySymbol }) },
    });
    try {
      if (navigator.share) {
        await navigator.share({ title: t('mweb.giftCards.title'), text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      notifySuccess(t('mweb.referral.linkCopied'));
    } catch {
      /* user cancelled or clipboard unavailable */
    }
  };

  return (
    <Box>
      <GiftCardVisual
        scopeType={card.scope_type}
        scopeCategoryId={card.scope_category_id}
        scopeName={card.scope_name}
        scopeImageUrl={card.scope_image_url}
        artworkFrontUrl={card.scope_image_front_url}
        artworkBackUrl={card.scope_image_back_url}
        amount={card.initial_amount}
        currencySymbol={currencySymbol}
        code={card.code}
      />
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.75 }}>
        <Chip size="small" color={STATUS_COLOR[card.status]} label={t(STATUS_KEY[card.status])} />
        <Typography variant="caption" color="text.secondary" sx={{ flex: 1, minWidth: 0 }} noWrap>
          {t('mweb.giftCards.validUntil', { vars: { date: formatDate(card.expires_at) } })}
        </Typography>
        <IconButton size="small" onClick={copyCode} aria-label={t('mweb.giftCards.copyCode')}>
          <ContentCopyIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={shareCard} aria-label={t('mweb.giftCards.shareCard')}>
          <ShareIcon fontSize="small" />
        </IconButton>
      </Stack>
      {showRecipient && (
        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
          {card.recipient_name || card.recipient_email}
        </Typography>
      )}
    </Box>
  );
}
