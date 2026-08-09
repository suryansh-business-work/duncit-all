import {
  Alert,
  Button,
  Stack,
  Typography,
} from '@mui/material';
import ShareIcon from '@mui/icons-material/Share';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { podUrl } from '../../utils/seoUrls';
import BackoutInProcessPanel from './BackoutInProcessPanel';
import MemberPanel from './MemberPanel';
import { compactButtonSx, gradientButtonSx } from './buttonSx';
import { buildPodShareText } from './usePodDetailActions';
import SeatPicker from './SeatPicker';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  pod: any;
  isFree: boolean;
  isHost: boolean;
  priceFormat: (n: number) => string;
  membershipState: any;
  joining: boolean;
  backingOut: boolean;
  restoringSpot: boolean;
  /** Seats this booking will take (1 by default). */
  seats: number;
  onSeatsChange: (seats: number) => void;
  onJoinFree: () => void;
  onBackout: () => void;
  onKeepSpot: () => void;
  onPaidCheckout: () => void;
  onCopyReferral: (token: string) => void;
  onGoToDashboard: () => void;
}


export default function PodActionPanel({
  pod,
  isFree,
  isHost,
  priceFormat,
  membershipState,
  joining,
  backingOut,
  restoringSpot,
  seats,
  onSeatsChange,
  onJoinFree,
  onBackout,
  onKeepSpot,
  onPaidCheckout,
  onCopyReferral,
  onGoToDashboard,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const ms = membershipState;
  const isMember = ms?.is_member;
  const inProcess = !!ms?.backout_in_process;
  const m = ms?.membership;
  const referralToken = m?.referral_token as string | null;

  // The host is auto-enrolled as an attendee and must never book their own pod
  // — replace the booking CTA with the Host Studio entry point.
  if (isHost) {
    return (
      <Button
        variant="contained"
        size="large"
        fullWidth
        onClick={onGoToDashboard}
        sx={gradientButtonSx}
      >
        {t('mweb.podDetails.goToDashboard')}
      </Button>
    );
  }

  // Once the pod's date has passed, booking is closed — block checkout entirely
  // (the server enforces the same rule on joinFree + payment order creation).
  const isExpired =
    !!pod?.pod_date_time && new Date(pod.pod_date_time).getTime() < Date.now();
  if (isExpired && !isMember && !inProcess) {
    return (
      <Alert severity="warning" sx={{ borderRadius: '16px' }}>
        {t('mweb.podDetails.bookingClosed')}
      </Alert>
    );
  }

  if (inProcess) {
    return (
      <BackoutInProcessPanel
        canCancel={!!ms?.can_cancel_backout}
        busy={restoringSpot}
        onKeepSpot={onKeepSpot}
      />
    );
  }

  if (isMember) {
    return (
      <MemberPanel
        isExpired={isExpired}
        canBackout={!!ms?.can_backout}
        backingOut={backingOut}
        deductionPct={ms?.backout_deduction_pct ?? 0}
        onBackout={onBackout}
      />
    );
  }

  if (m?.status === 'BACKED_OUT' && referralToken) {
    return (
      <Stack spacing={1}>
        <Alert severity="warning">
          {t('mweb.podDetails.backedOutRefundLead')} <b>{m.refund_status}</b>
        </Alert>
        <Typography variant="body2">{t('mweb.podDetails.referFriend')}</Typography>
        <Button
          variant="outlined"
          startIcon={<ContentCopyIcon />}
          onClick={() => onCopyReferral(referralToken)}
          sx={compactButtonSx}
        >
          {t('mweb.podDetails.copyReferralLink')}
        </Button>
        {(navigator as any).share && (
          <Button
            variant="text"
            startIcon={<ShareIcon />}
            onClick={() => {
              const url = `${globalThis.window.location.origin}${podUrl(pod.club_slug, pod.pod_id)}?ref=${referralToken}`;
              return (navigator as any).share({
                title: pod.pod_title,
                text: buildPodShareText(pod, url),
                url,
              });
            }}
            sx={compactButtonSx}
          >
            {t('mweb.podDetails.share')}
          </Button>
        )}
      </Stack>
    );
  }

  const maxSeats = Number(ms?.max_seats_per_booking ?? 1);
  const payLabel = t('mweb.podDetails.bookAndPay', {
    vars: { amount: priceFormat(Number(pod.pod_amount || 0) * seats) },
  });

  if (isFree) {
    return (
      <Stack direction="row" spacing={1} alignItems="center">
        <SeatPicker
          value={seats}
          onChange={onSeatsChange}
          maxSeats={maxSeats}
          disabled={joining || ms?.can_join === false}
        />
        <Button
          variant="contained"
          size="large"
          fullWidth
          disabled={joining || ms?.can_join === false}
          onClick={onJoinFree}
          sx={gradientButtonSx}
        >
          {ms?.can_join === false
            ? t('mweb.podDetails.podIsFull')
            : t('mweb.podDetails.joinFreePod')}
        </Button>
      </Stack>
    );
  }

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <SeatPicker
        value={seats}
        onChange={onSeatsChange}
        maxSeats={maxSeats}
        disabled={ms?.can_join === false}
      />
      <Button
        variant="contained"
        size="large"
        fullWidth
        disabled={ms?.can_join === false}
        onClick={onPaidCheckout}
        sx={gradientButtonSx}
      >
        {ms?.can_join === false ? t('mweb.podDetails.podIsFull') : payLabel}
      </Button>
    </Stack>
  );
}
