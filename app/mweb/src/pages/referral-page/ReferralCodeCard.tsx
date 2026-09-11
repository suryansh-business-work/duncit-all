import { Box, Card, Stack, Typography } from '@mui/material';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcardOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopyRounded';
import IosShareIcon from '@mui/icons-material/IosShare';
import LinkIcon from '@mui/icons-material/LinkRounded';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import TwoToneHeading from '../../components/TwoToneHeading';
import IconDisc from '../account-page/IconDisc';
import { useTranslation } from '../../i18n/useTranslation';
import type { MyReferral } from './queries';

interface Props {
  referral: MyReferral;
  onCopyCode: () => void;
  onCopyLink: () => void;
  onShare: () => void;
}

/** The dashed soft pill the code sits in, with its round copy button. */
const CODE_PILL_SX = {
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  width: '100%',
  minHeight: 56,
  pl: 2.5,
  pr: 0.75,
  borderRadius: 999,
  border: '1.5px dashed',
  borderColor: 'divider',
  bgcolor: 'action.hover',
} as const;

/** The hero: what referring is worth, my code, and the ways to pass it on. */
export default function ReferralCodeCard({
  referral,
  onCopyCode,
  onCopyLink,
  onShare,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const coins =
    referral.coins_per_referral > 0
      ? t('mweb.referral.bothEarn', { vars: { coins: referral.coins_per_referral } })
      : null;

  return (
    <Card sx={{ p: 2.5 }}>
      <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center' }}>
        <IconDisc size={56}>
          <CardGiftcardIcon />
        </IconDisc>
        <TwoToneHeading lead={t('mweb.referral.title')} trail={coins} stacked align="center" />

        <Stack spacing={0.75} sx={{ width: '100%' }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
            {t('mweb.referral.yourCode')}
          </Typography>
          <Box sx={CODE_PILL_SX}>
            <Typography sx={{ flex: 1, fontSize: 20, fontWeight: 700, letterSpacing: 2, textAlign: 'left' }} noWrap>
              {referral.code}
            </Typography>
            <DuncitIconButton
              onClick={onCopyCode}
              data-testid="referral-copy-code"
              aria-label={t('mweb.referral.copyCode')}
              sx={{ width: 44, height: 44, bgcolor: 'background.paper', flexShrink: 0 }}
            >
              <ContentCopyIcon fontSize="small" />
            </DuncitIconButton>
          </Box>
        </Stack>

        {/*
          Three ways out, because they travel differently: a code survives being
          read out loud, a link does the typing for whoever receives it, and the
          share sheet carries the message Finance wrote around both.
        */}
        <Stack direction="row" spacing={1} sx={{ width: '100%' }}>
          <DuncitButton
            variant="contained"
            size="large"
            startIcon={<IosShareIcon />}
            onClick={onShare}
            data-testid="referral-share"
            sx={{ flex: 1 }}
          >
            {t('mweb.referral.share')}
          </DuncitButton>
          <DuncitButton
            color="inherit"
            size="large"
            startIcon={<LinkIcon />}
            onClick={onCopyLink}
            data-testid="referral-copy-link"
            sx={{ flex: 1, bgcolor: 'action.hover' }}
          >
            {t('mweb.referral.copyLink')}
          </DuncitButton>
        </Stack>

        {referral.gift_description && (
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', width: '100%', textAlign: 'left' }}>
            <IconDisc>
              <CardGiftcardIcon />
            </IconDisc>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {referral.gift_description}
            </Typography>
          </Stack>
        )}

        {referral.referred_by_name && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t('mweb.referral.referredBy', { vars: { name: referral.referred_by_name } })}
          </Typography>
        )}
      </Stack>
    </Card>
  );
}
