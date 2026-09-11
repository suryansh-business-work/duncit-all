import { Stack } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import LockClockIcon from '@mui/icons-material/LockClock';
import { DuncitButton } from '@duncit/buttons';
import { BarLabel, BarNotice } from './BarLabel';
import { compactButtonSx, ctaButtonSx } from './buttonSx';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  /** The pod's own date has passed — nothing about the seat can change now. */
  isExpired: boolean;
  canBackout: boolean;
  backingOut: boolean;
  /** Seats this member has already released and is still waiting to have
   * filled. A partial backout leaves them JOINED, so nothing else in this
   * panel would reveal that seats are out on sale. */
  releasedSeats: number;
  /** False once a replacement took them — the release is terminal then. */
  canTakeSeatsBack: boolean;
  restoringSpot: boolean;
  onBackout: () => void;
  onKeepSpot: () => void;
}

/**
 * What a member sees on a pod they already hold a seat on: the booked state on
 * the left, Backout on the right, and the seats a partial backout gave back.
 *
 * The note under the state used to be a two-way choice — either the backout
 * tip or "you have used all your attempts" — so a pod that had simply already
 * happened told the member they had run out of attempts. It now names the one
 * reason the Backout button is missing, as the native bar does (rule 27); the
 * deduction is stated by the Backout dialog before the member confirms.
 */
export default function MemberPanel({
  isExpired,
  canBackout,
  backingOut,
  releasedSeats,
  canTakeSeatsBack,
  restoringSpot,
  onBackout,
  onKeepSpot,
}: Readonly<Props>) {
  const { t } = useTranslation();
  let note: string | null = null;
  if (!canBackout) {
    note = isExpired ? t('mweb.podDetails.alreadyTakenPlace') : t('mweb.podDetails.backoutMaxed');
  }
  const overline = isExpired ? t('mweb.podDetails.youWent') : t('mweb.podDetails.youreGoing');
  const badge = isExpired ? t('mweb.podDetails.podVisited') : t('mweb.podDetails.podBooked');

  return (
    <Stack spacing={1} sx={{ pl: 1 }}>
      <ReleasedSeatsRow
        releasedSeats={releasedSeats}
        canTakeSeatsBack={canTakeSeatsBack}
        restoringSpot={restoringSpot}
        onKeepSpot={onKeepSpot}
      />
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minHeight: 48 }}>
        <BarLabel
          icon={<CheckCircleIcon sx={{ color: 'success.main' }} />}
          caption={overline}
          value={badge}
          note={note}
        />
        {canBackout && (
          <DuncitButton
            variant="outlined"
            color="error"
            onClick={onBackout}
            disabled={backingOut}
            sx={{ ...ctaButtonSx, fontSize: 14 }}
          >
            {t('mweb.podDetails.backout')}
          </DuncitButton>
        )}
      </Stack>
    </Stack>
  );
}

/**
 * The seats a partial backout gave back, and the way to take them back.
 *
 * A partial release keeps the member JOINED, so it never reaches the
 * "Backout in process" panel — without this the released seats could only be
 * reclaimed by someone else buying them.
 */
function ReleasedSeatsRow({
  releasedSeats,
  canTakeSeatsBack,
  restoringSpot,
  onKeepSpot,
}: Readonly<{
  releasedSeats: number;
  canTakeSeatsBack: boolean;
  restoringSpot: boolean;
  onKeepSpot: () => void;
}>) {
  const { t } = useTranslation();
  if (releasedSeats <= 0) return null;
  if (!canTakeSeatsBack) {
    return (
      <BarNotice icon={<LockClockIcon fontSize="small" sx={{ color: 'warning.main' }} />}>
        {t('mweb.podDetails.backoutLocked')}
      </BarNotice>
    );
  }
  const releasedKey =
    releasedSeats === 1 ? 'mweb.podDetails.releasedSeatsOne' : 'mweb.podDetails.releasedSeatsMany';
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <BarNotice icon={<HourglassTopIcon fontSize="small" sx={{ color: 'warning.main' }} />}>
        {t(releasedKey, { vars: { count: releasedSeats } })}
      </BarNotice>
      <DuncitButton variant="contained" onClick={onKeepSpot} disabled={restoringSpot} sx={compactButtonSx}>
        {t('mweb.podDetails.takeSeatsBack')}
      </DuncitButton>
    </Stack>
  );
}
