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
import { buildPodShareText } from './usePodDetailActions';

interface Props {
  pod: any;
  isFree: boolean;
  priceFormat: (n: number) => string;
  membershipState: any;
  joining: boolean;
  backingOut: boolean;
  restoringSpot: boolean;
  selectedProductTotal: number;
  onJoinFree: () => void;
  onBackout: () => void;
  onKeepSpot: () => void;
  onPaidCheckout: () => void;
  onCopyReferral: (token: string) => void;
}

const compactButtonSx = {
  minHeight: 40,
  px: 1.5,
  fontSize: 13,
  fontWeight: 950,
  whiteSpace: 'nowrap',
};

const gradientButtonSx = {
  ...compactButtonSx,
  background: 'linear-gradient(135deg, #ff4f73 0%, #ff8b5f 54%, #f5337a 100%)',
  boxShadow: '0 12px 24px rgba(245,51,122,0.28)',
  '&:hover': {
    background: 'linear-gradient(135deg, #ef3b63 0%, #f9794d 54%, #db2468 100%)',
    boxShadow: '0 14px 28px rgba(245,51,122,0.34)',
  },
};

export default function PodActionPanel({
  pod,
  isFree,
  priceFormat,
  membershipState,
  joining,
  backingOut,
  restoringSpot,
  selectedProductTotal,
  onJoinFree,
  onBackout,
  onKeepSpot,
  onPaidCheckout,
  onCopyReferral,
}: Readonly<Props>) {
  const ms = membershipState;
  const isMember = ms?.is_member;
  const inProcess = !!ms?.backout_in_process;
  const m = ms?.membership;
  const referralToken = m?.referral_token as string | null;

  // Once the pod's date has passed, booking is closed — block checkout entirely
  // (the server enforces the same rule on joinFree + payment order creation).
  const isExpired =
    !!pod?.pod_date_time && new Date(pod.pod_date_time).getTime() < Date.now();
  if (isExpired && !isMember && !inProcess) {
    return (
      <Alert severity="warning" sx={{ borderRadius: 2 }}>
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
    const canBackout = !!ms?.can_backout;
    return (
      <Stack spacing={1}>
        <Stack direction="row" spacing={1}>
          <Button variant="contained" color="success" disabled fullWidth sx={compactButtonSx}>
            Joined
          </Button>
          {canBackout && (
            <Button
              variant="outlined"
              color="error"
              onClick={onBackout}
              disabled={backingOut}
              fullWidth
              sx={compactButtonSx}
            >
              Backout
            </Button>
          )}
        </Stack>
        {canBackout ? (
          <Typography variant="caption" color="text.secondary">
            Backing out releases your seat — you will get the refund only if someone fills your
            spot ({ms?.backout_deduction_pct ?? 0}% deduction applies on paid pods).
          </Typography>
        ) : (
          <Alert severity="info">
            You have reached the maximum number of Backout attempts allowed for this Pod.
          </Alert>
        )}
      </Stack>
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
            onClick={() =>
              (navigator as any).share({
                title: pod.pod_title,
                text: buildPodShareText(pod),
                url: `${globalThis.window.location.origin}${podUrl(pod.club_slug, pod.pod_id)}?ref=${referralToken}`,
              })
            }
            sx={compactButtonSx}
          >
            Share
          </Button>
        )}
      </Stack>
    );
  }

  if (isFree) {
    return (
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
    );
  }

  return (
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
        : `Book & Pay ${priceFormat(Number(pod.pod_amount || 0) + selectedProductTotal)}`}
    </Button>
  );
}
