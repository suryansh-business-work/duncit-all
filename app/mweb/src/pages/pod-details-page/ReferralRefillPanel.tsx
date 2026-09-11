import { Stack, Typography } from '@mui/material';
import ShareIcon from '@mui/icons-material/Share';
import UndoIcon from '@mui/icons-material/Undo';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { DuncitButton } from '@duncit/buttons';
import { podUrl } from '../../utils/seoUrls';
import { BarLabel } from './BarLabel';
import { compactButtonSx } from './buttonSx';
import { buildPodShareText } from './usePodDetailActions';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  pod: any;
  refundStatus: string;
  referralToken: string;
  onCopyReferral: (token: string) => void;
}

/** A booking that was backed out and can be refilled through the member's own
 * referral link — the one booking-bar state only mWeb has. */
export default function ReferralRefillPanel({ pod, refundStatus, referralToken, onCopyReferral }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1} sx={{ flex: 1, minWidth: 0, px: 0.5 }}>
      <BarLabel
        icon={<UndoIcon sx={{ color: 'warning.main' }} />}
        caption={t('mweb.podDetails.backedOutRefundLead')}
        value={refundStatus}
      />
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {t('mweb.podDetails.referFriend')}
      </Typography>
      <Stack direction="row" spacing={1}>
        <DuncitButton
          variant="outlined"
          startIcon={<ContentCopyIcon />}
          onClick={() => onCopyReferral(referralToken)}
          sx={compactButtonSx}
        >
          {t('mweb.podDetails.copyReferralLink')}
        </DuncitButton>
        {(navigator as any).share && (
          <DuncitButton
            variant="text"
            startIcon={<ShareIcon />}
            onClick={() => {
              const url = `${globalThis.window.location.origin}${podUrl(pod.club_slug, pod.pod_id)}?ref=${referralToken}`;
              // No `url` field — see the note in usePodDetailActions.onShare:
              // targets that take `url` drop `text`, which would strip the
              // referral share back to a bare link too. The link (with its
              // ?ref) is the last line of the text.
              return (navigator as any).share({
                title: pod.pod_title,
                text: buildPodShareText(pod, url),
              });
            }}
            sx={compactButtonSx}
          >
            {t('mweb.podDetails.share')}
          </DuncitButton>
        )}
      </Stack>
    </Stack>
  );
}
