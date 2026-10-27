import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Box, Card, Typography } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';

interface GiftCardRedeemSuccessProps {
  /** Coins credited by THIS redemption — 0 when the card had already paid out. */
  coinsAdded: number;
  coinBalance: number;
}

/** The success mark: a green check on the tonal green disc. */
const CHECK_DISC_SX = {
  width: 72,
  height: 72,
  mx: 'auto',
  borderRadius: '50%',
  display: 'grid',
  placeItems: 'center',
  color: 'accent.main',
  bgcolor: (theme: Theme) => alpha(theme.palette.primary.main, 0.12),
  '& svg': { fontSize: 40 },
} as const;

/**
 * What every redemption ends on — an emailed code (redeem and claim pages) or a
 * printed card: the coins added, the new balance, and the way to the coins.
 * One card, so the two doors can never report a redemption differently.
 */
export default function GiftCardRedeemSuccess({ coinsAdded, coinBalance }: Readonly<GiftCardRedeemSuccessProps>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // The button that was pressed is gone with the form it sat in, so focus moves
  // to the outcome — a keyboard or screen-reader user lands on it, not on <body>.
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);
  // A repeat redemption by the same holder is a no-op reporting 0 coins.
  const body =
    coinsAdded > 0
      ? t('mweb.giftCards.redeemSuccessBody', { vars: { coins: coinsAdded, balance: coinBalance } })
      : t('mweb.giftCards.redeemAlreadyBody');
  return (
    <Card data-testid="gift-card-redeem-success" sx={{ p: 3, textAlign: 'center' }}>
      <Box sx={CHECK_DISC_SX}>
        <CheckRoundedIcon />
      </Box>
      <Typography ref={headingRef} tabIndex={-1} component="h2" sx={{ fontSize: '1.25rem', fontWeight: 600, mt: 2 }}>
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
      <DuncitButton data-testid="gift-card-go-to-coins" variant="contained" size="large" fullWidth onClick={() => navigate('/duncit-coin')} sx={{ mt: 2.5 }}>
        {t('mweb.giftCards.goToCoins')}
      </DuncitButton>
    </Card>
  );
}
