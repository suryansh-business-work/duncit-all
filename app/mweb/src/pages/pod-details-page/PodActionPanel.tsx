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
        Go to Dashboard
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
        This pod has already taken place — booking is closed.
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
          You have backed out. Refund status: <b>{m.refund_status}</b>
        </Alert>
        <Typography variant="body2">
          Refer a friend to refill your spot — your refund is initiated once your spot is filled.
        </Typography>
        <Button
          variant="outlined"
          startIcon={<ContentCopyIcon />}
          onClick={() => onCopyReferral(referralToken)}
          sx={compactButtonSx}
        >
          Copy referral link
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
            Share
          </Button>
        )}
      </Stack>
    );
  }

  const maxSeats = Number(ms?.max_seats_per_booking ?? 1);

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
          {ms?.can_join === false ? 'Pod is full' : 'Join free pod'}
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
        {ms?.can_join === false
          ? 'Pod is full'
          : `Book & Pay ${priceFormat(Number(pod.pod_amount || 0) * seats)}`}
      </Button>
    </Stack>
  );
}
