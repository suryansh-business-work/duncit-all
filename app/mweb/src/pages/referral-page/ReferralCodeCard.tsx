import { Alert, Box, Card, CardContent, Stack, Typography } from '@mui/material';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import IosShareIcon from '@mui/icons-material/IosShare';
import LinkIcon from '@mui/icons-material/Link';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';
import type { MyReferral } from './queries';

interface Props {
  referral: MyReferral;
  onCopyCode: () => void;
  onCopyLink: () => void;
  onShare: () => void;
}

/** My code, the three ways to pass it on, and what it is worth. */
export default function ReferralCodeCard({
  referral,
  onCopyCode,
  onCopyLink,
  onShare,
}: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            fontWeight: 700
          }}>
          {t('mweb.referral.yourCode')}
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: 1, mt: 0.5 }}>
          {referral.code}
        </Typography>

        {/*
          Three ways out, because they travel differently: a code survives being
          read out loud, a link does the typing for whoever receives it, and the
          share sheet carries the message Finance wrote around both.
        */}
        <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap', gap: 1 }}>
          <DuncitButton
            size="small"
            variant="contained"
            startIcon={<IosShareIcon />}
            onClick={onShare}
            data-testid="referral-share"
          >
            {t('mweb.referral.share')}
          </DuncitButton>
          <DuncitButton
            size="small"
            startIcon={<ContentCopyIcon />}
            onClick={onCopyCode}
            data-testid="referral-copy-code"
          >
            {t('mweb.referral.copyCode')}
          </DuncitButton>
          <DuncitButton
            size="small"
            startIcon={<LinkIcon />}
            onClick={onCopyLink}
            data-testid="referral-copy-link"
          >
            {t('mweb.referral.copyLink')}
          </DuncitButton>
        </Stack>

        {referral.coins_per_referral > 0 && (
          <Stack
            direction="row"
            spacing={1}
            sx={{
              alignItems: "center",
              mt: 1.75
            }}>
            <MonetizationOnIcon fontSize="small" color="primary" />
            <Typography
              variant="body2"
              sx={{
                color: "primary.main",
                fontWeight: 700
              }}>
              {t('mweb.referral.bothEarn', { vars: { coins: referral.coins_per_referral } })}
            </Typography>
          </Stack>
        )}

        {referral.gift_description && (
          <Alert icon={<CardGiftcardIcon />} severity="success" sx={{ mt: 1.5 }}>
            {referral.gift_description}
          </Alert>
        )}

        {referral.referred_by_name && (
          <Box sx={{ mt: 1 }}>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                fontWeight: 700
              }}>
              {t('mweb.referral.referredBy', { vars: { name: referral.referred_by_name } })}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
