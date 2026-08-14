import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@apollo/client';
import { Alert, Button, Paper, Stack, Typography } from '@mui/material';
import { useTranslation } from '../../i18n/useTranslation';
import { useDateFormat } from '../../utils/dateFormat';
import GiftCardVisual from './GiftCardVisual';
import { REDEEM_GIFT_CARD, type GiftCard, type GiftCardRedeemResult } from './queries';

interface GiftCardRedeemViewProps {
  card: GiftCard;
  currencySymbol: string;
}

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
      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: '16px', textAlign: 'center' }}>
        <Typography variant="h6" fontWeight={700}>
          {t('mweb.giftCards.redeemSuccessTitle')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {body}
        </Typography>
        <Button
          variant="contained"
          onClick={() => navigate('/duncit-coin')}
          sx={{ mt: 2, borderRadius: 999, fontWeight: 700 }}
        >
          {t('mweb.giftCards.goToCoins')}
        </Button>
      </Paper>
    );
  }

  let statusBody: string | null = null;
  if (card.status === 'EXPIRED') statusBody = t('mweb.giftCards.claimExpiredBody');
  else if (card.status === 'REDEEMED') statusBody = t('mweb.giftCards.claimRedeemedBody');

  return (
    <Stack spacing={1.5}>
      <GiftCardVisual
        scopeType={card.scope_type}
        scopeCategoryId={card.scope_category_id}
        scopeName={card.scope_name}
        scopeImageUrl={card.scope_image_url}
        amount={card.initial_amount}
        currencySymbol={currencySymbol}
        code={card.code}
      />
      {card.sender_name && (
        <Typography variant="body2" fontWeight={700}>
          {t('mweb.giftCards.claimFrom', { vars: { sender: card.sender_name } })}
        </Typography>
      )}
      {card.message && (
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          {card.message}
        </Typography>
      )}
      <Typography variant="caption" color="text.secondary">
        {t('mweb.giftCards.validUntil', { vars: { date: formatDate(card.expires_at) } })}
      </Typography>
      {statusBody ? (
        <Alert severity="warning">{statusBody}</Alert>
      ) : (
        <>
          {error && <Alert severity="error">{error}</Alert>}
          <Button
            variant="contained"
            size="large"
            disabled={loading}
            onClick={redeem}
            sx={{ borderRadius: 999, fontWeight: 700 }}
          >
            {t('mweb.giftCards.redeemCta')}
          </Button>
        </>
      )}
    </Stack>
  );
}
