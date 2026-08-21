import { useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import { referralLink, renderReferralMessage } from '@duncit/utils';
import { useShareUrl } from '../../lib/share-link';
import { notifySuccess } from '../../components/notify';
import { formatRelative } from '../../components/app-header/queries';
import { useTranslation } from '../../i18n/useTranslation';
import ReferralCodeCard from './ReferralCodeCard';
import { MY_REFERRAL, type MyReferral } from './queries';

/**
 * Refer & Earn — my code and the three ways to pass it on.
 *
 * There is no "enter a friend's code" box any more: a code is redeemed once,
 * at signup, where it can still be checked while the form is on screen. Left
 * here it was a second way in that could only ever be used by somebody who had
 * already finished signing up without it.
 */
export default function ReferralPage() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<{ myReferral: MyReferral }>(MY_REFERRAL, {
    fetchPolicy: 'cache-and-network',
  });
  const referral = data?.myReferral;
  // Handed out as a tracked duncit.com link, so the signups a member brings in
  // are attributed to their share the same way any other campaign traffic is.
  const link = useShareUrl(
    'REFERRAL',
    referral?.code ?? '',
    referral ? referralLink(referral.code, globalThis.location.origin) : '',
  );

  if (loading && !data) {
    return (
      <Stack alignItems="center" sx={{ p: 6 }}>
        <CircularProgress size={24} />
      </Stack>
    );
  }
  if (error || !referral) {
    return <Alert severity="error">{error?.message ?? t('mweb.referral.loadError')}</Alert>;
  }

  const message = renderReferralMessage(referral.share_message, {
    code: referral.code,
    link,
    coins: referral.coins_per_referral,
  });

  const copy = async (value: string, toast: string) => {
    try {
      await navigator.clipboard.writeText(value);
      notifySuccess(toast);
    } catch {
      /* clipboard unavailable */
    }
  };

  // Share sheet where the browser has one, clipboard where it does not — the
  // same progressive pattern the rest of mWeb shares links with (utils/share).
  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: t('mweb.referral.title'), text: message });
        return;
      }
      await copy(message, t('mweb.referral.linkCopied'));
    } catch {
      /* user cancelled */
    }
  };

  const friends = referral.referred;

  return (
    <Stack spacing={2.25} sx={{ maxWidth: 640, mx: 'auto', width: '100%' }}>
      <Stack direction="row" alignItems="center" spacing={1.25}>
        <Box
          sx={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            color: 'primary.contrastText',
            bgcolor: 'primary.main',
          }}
        >
          <CardGiftcardIcon fontSize="small" />
        </Box>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1 }}>
            {t('mweb.referral.title')}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            {t('mweb.referral.subtitle')}
          </Typography>
        </Box>
      </Stack>

      <ReferralCodeCard
        referral={referral}
        onCopyCode={() => void copy(referral.code, t('mweb.referral.codeCopied'))}
        onCopyLink={() => void copy(link, t('mweb.referral.linkCopied'))}
        onShare={() => void share()}
      />

      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 700 }}>
              {t('mweb.referral.friendsTitle')}
            </Typography>
            <Chip size="small" label={friends.length} />
          </Stack>
          {friends.length === 0 ? (
            <Alert severity="info">{t('mweb.referral.empty')}</Alert>
          ) : (
            <Stack spacing={1}>
              {friends.map((entry) => (
                <Stack
                  key={entry.user_id}
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  sx={{ p: 1.25, borderRadius: 2, border: 1, borderColor: 'divider' }}
                >
                  <Typography variant="subtitle2" sx={{ flex: 1, fontWeight: 600 }} noWrap>
                    {entry.full_name || t('mweb.referral.newMember')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                    {formatRelative(entry.referred_at)} ago
                  </Typography>
                </Stack>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
