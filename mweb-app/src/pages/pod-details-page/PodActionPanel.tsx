import {
  Alert,
  Button,
  Stack,
  Typography,
} from '@mui/material';
import ShareIcon from '@mui/icons-material/Share';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { podUrl } from '../../utils/seoUrls';

interface Props {
  pod: any;
  isFree: boolean;
  priceFormat: (n: number) => string;
  membershipState: any;
  joining: boolean;
  backingOut: boolean;
  onJoinFree: () => void;
  onBackout: () => void;
  onPaidCheckout: () => void;
  onCopyReferral: (token: string) => void;
}

export default function PodActionPanel({
  pod,
  isFree,
  priceFormat,
  membershipState,
  joining,
  backingOut,
  onJoinFree,
  onBackout,
  onPaidCheckout,
  onCopyReferral,
}: Props) {
  const ms = membershipState;
  const isMember = ms?.is_member;
  const m = ms?.membership;
  const referralToken = m?.referral_token as string | null;

  if (isMember) {
    return (
      <Stack spacing={1}>
        <Stack direction="row" spacing={1}>
          <Button variant="contained" color="success" disabled fullWidth>
            Joined
          </Button>
          <Button
            variant="outlined"
            color="error"
            onClick={onBackout}
            disabled={backingOut}
            fullWidth
          >
            Backout
          </Button>
        </Stack>
        <Typography variant="caption" color="text.secondary">
          Refunds (paid pods) are processed once {ms?.refund_threshold_pct ?? 80}% of spots are
          filled or someone joins via your referral link.
        </Typography>
      </Stack>
    );
  }

  if (m && m.status === 'BACKED_OUT' && referralToken) {
    return (
      <Stack spacing={1}>
        <Alert severity="warning">
          You have backed out. Refund status: <b>{m.refund_status}</b>
        </Alert>
        <Typography variant="body2">
          Refer a friend to refill your spot — your refund processes immediately when they join.
        </Typography>
        <Button
          variant="outlined"
          startIcon={<ContentCopyIcon />}
          onClick={() => onCopyReferral(referralToken)}
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
                url: `${window.location.origin}${podUrl(pod.club_slug, pod.pod_id)}?ref=${referralToken}`,
              })
            }
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
        disabled={joining || ms?.can_join === false}
        onClick={onJoinFree}
      >
        {ms?.can_join === false ? 'Pod is full' : 'Join free pod'}
      </Button>
    );
  }

  return (
    <Button
      variant="contained"
      size="large"
      disabled={ms?.can_join === false}
      onClick={onPaidCheckout}
    >
      {ms?.can_join === false
        ? 'Pod is full'
        : `Book & Pay ${priceFormat(pod.pod_amount)}`}
    </Button>
  );
}
