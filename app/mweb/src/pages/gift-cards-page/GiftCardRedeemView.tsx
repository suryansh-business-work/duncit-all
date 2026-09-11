import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation } from '@apollo/client/react';
import { Alert, Box, Card, Stack, Typography } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';
import { useDateFormat } from '../../utils/dateFormat';
import GiftCardVisual from './GiftCardVisual';
import { REDEEM_GIFT_CARD, type GiftCard, type GiftCardRedeemResult } from './queries';

interface GiftCardRedeemViewProps {
  card: GiftCard;
  currencySymbol: string;
}

/** The success mark: a green check on the tonal green disc. */
const CHECK_DISC_SX = {
  width: 72,
  height: 72,
  mx: 'auto',
  borderRadius: '50%',
  display: 'grid',
  placeItems: 'center',
  color: 'primary.main',
  bgcolor: (theme: Theme) => alpha(theme.palette.primary.main, 0.12),
  '& svg': { fontSize: 40 },
} as const;

/**
 * The looked-up card plus its redeem action — shared by the redeem page (code
 * typed in) and the claim page (code in the link), so both flows behave
 * identically. Redeeming converts the FULL value into Duncit Coins.
 */
export default function GiftCardRedeemView({ card, currencySymbol }: Readonly<GiftCardRedeemViewProps>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { formatDate } = useDateFormat();
  const [doRedeem, { loading }] = useMutation<{ redeemGiftCard: GiftCardRedeemResult }>(REDEEM_GIFT_CARD);
  const [result, setResult] = useState<GiftCardRedeemResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const redeem = async () => {
    setError(null);
    try {
      const res = await doRedeem({ variables: { code: card.code } });
      const outcome = res.data?.redeemGiftCard ?? null;
      if (outcome) setResult(outcome);
      else setError(t('mweb.giftCards.redeemError'));
    } catch {
      setError(t('mweb.giftCards.redeemError'));
    }
  };

  if (result) {
    // A repeat redemption by the same holder is a no-op reporting 0 coins.
    const body =
      result.coins_added > 0
        ? t('mweb.giftCards.redeemSuccessBody', {
            vars: { coins: result.coins_added, balance: result.coin_balance },
          })
        : t('mweb.giftCards.redeemAlreadyBody');
    return (
      <Card sx={{ p: 3, textAlign: 'center' }}>
        <Box sx={CHECK_DISC_SX}>
          <CheckRoundedIcon />
        </Box>
        <Typography component="h2" sx={{ fontSize: '1.25rem', fontWeight: 600, mt: 2 }}>
          {t('mweb.giftCards.redeemSuccessTitle')}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            mt: 0.75
          }}>
          {body}
        </Typography>
        <DuncitButton variant="contained" size="large" fullWidth onClick={() => navigate('/duncit-coin')} sx={{ mt: 2.5 }}>
          {t('mweb.giftCards.goToCoins')}
        </DuncitButton>
      </Card>
    );
  }

  let statusBody: string | null = null;
  if (card.status === 'EXPIRED') statusBody = t('mweb.giftCards.claimExpiredBody');
  else if (card.status === 'REDEEMED') statusBody = t('mweb.giftCards.claimRedeemedBody');

  return (
    <Card sx={{ p: 1.5 }}>
      <Stack spacing={1.5}>
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
        <Stack spacing={0.75} sx={{ px: 0.5 }}>
          {card.sender_name && (
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {t('mweb.giftCards.claimFrom', { vars: { sender: card.sender_name } })}
            </Typography>
          )}
          {card.message && (
            <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
              {card.message}
            </Typography>
          )}
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t('mweb.giftCards.validUntil', { vars: { date: formatDate(card.expires_at) } })}
          </Typography>
        </Stack>
        {statusBody ? (
          <Alert severity="warning">{statusBody}</Alert>
        ) : (
          <>
            {error && <Alert severity="error">{error}</Alert>}
            <DuncitButton variant="contained" size="large" fullWidth disabled={loading} onClick={redeem}>
              {t('mweb.giftCards.redeemCta')}
            </DuncitButton>
          </>
        )}
      </Stack>
    </Card>
  );
}
