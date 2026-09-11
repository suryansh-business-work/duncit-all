import { Stack } from '@mui/material';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import { podPhase } from '@duncit/utils';
import { DuncitButton } from '@duncit/buttons';
import BackoutInProcessPanel from './BackoutInProcessPanel';
import MemberPanel from './MemberPanel';
import ReferralRefillPanel from './ReferralRefillPanel';
import { BarLabel, BarNotice } from './BarLabel';
import { ctaButtonSx } from './buttonSx';
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

/**
 * The booking bar's contents, by the viewer's state: host, closed, backing out,
 * booked, backed out, or still deciding. The price (or state) sits on the
 * left, the one green action on the right — the native bar's shape (rule 27).
 */
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
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', pl: 1 }}>
        <BarLabel caption={t('mweb.podDetails.youreHosting')} value={t('mweb.podDetails.yourPod')} />
        <DuncitButton variant="contained" onClick={onGoToDashboard} sx={ctaButtonSx}>
          {t('mweb.podDetails.goToDashboard')}
        </DuncitButton>
      </Stack>
    );
  }

  // Once the pod has STARTED, booking is closed — block checkout entirely (the
  // server enforces the same rule on joinFree + payment order creation). A pod
  // that is still running says so rather than claiming it has already happened.
  const phase = podPhase(pod?.pod_date_time, pod?.pod_end_date_time);
  const isExpired = phase !== 'UPCOMING';
  const closedMessage = phase === 'ONGOING'
    ? t('mweb.podDetails.bookingClosedOngoing')
    : t('mweb.podDetails.bookingClosed');
  if (isExpired && !isMember && !inProcess) {
    return (
      <Stack direction="row" sx={{ alignItems: 'center', minHeight: 48 }}>
        <BarNotice icon={<EventBusyIcon sx={{ color: 'warning.main' }} />}>{closedMessage}</BarNotice>
      </Stack>
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
        releasedSeats={Number(ms?.released_seats_pending ?? 0)}
        canTakeSeatsBack={!!ms?.can_cancel_backout}
        restoringSpot={restoringSpot}
        onBackout={onBackout}
        onKeepSpot={onKeepSpot}
      />
    );
  }

  if (m?.status === 'BACKED_OUT' && referralToken) {
    return (
      <ReferralRefillPanel
        pod={pod}
        refundStatus={m.refund_status}
        referralToken={referralToken}
        onCopyReferral={onCopyReferral}
      />
    );
  }

  const maxSeats = Number(ms?.max_seats_per_booking ?? 1);
  const isFull = ms?.can_join === false;
  const bookLabel = isFree ? t('mweb.podDetails.join') : t('mweb.podDetails.bookNow');
  const priceValue = isFree
    ? t('mweb.podDetails.free')
    : priceFormat(Number(pod.pod_amount || 0) * seats);
  const busy = isFree && joining;

  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', pl: 1 }}>
      <BarLabel
        caption={isFree ? t('mweb.podDetails.entry') : t('mweb.podDetails.price')}
        value={priceValue}
        emphasis="price"
      />
      <SeatPicker
        value={seats}
        onChange={onSeatsChange}
        maxSeats={maxSeats}
        disabled={busy || isFull}
      />
      <DuncitButton
        variant="contained"
        disabled={busy || isFull}
        onClick={isFree ? onJoinFree : onPaidCheckout}
        sx={ctaButtonSx}
      >
        {isFull ? t('mweb.podDetails.podIsFull') : bookLabel}
      </DuncitButton>
    </Stack>
  );
}
