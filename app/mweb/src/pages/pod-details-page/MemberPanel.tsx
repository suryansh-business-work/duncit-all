import { Alert, Button, Stack, Typography } from '@mui/material';
import { compactButtonSx } from './buttonSx';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  /** The pod's own date has passed — nothing about the seat can change now. */
  isExpired: boolean;
  canBackout: boolean;
  backingOut: boolean;
  deductionPct: number;
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
 * What a member sees on a pod they already hold a seat on.
 *
 * The note under the buttons used to be a two-way choice — either the backout
 * tip or "you have used all your attempts" — so a pod that had simply already
 * happened told the member they had run out of attempts. Three states, because
 * there are three reasons the button can be missing.
 */
export default function MemberPanel({
  isExpired,
  canBackout,
  backingOut,
  deductionPct,
  releasedSeats,
  canTakeSeatsBack,
  restoringSpot,
  onBackout,
  onKeepSpot,
}: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1}>
        {/* Same word Pod History uses for the same booking: "Joined" is a
            promise about something still ahead. */}
        <Button variant="contained" color="success" disabled fullWidth sx={compactButtonSx}>
          {isExpired ? t('mweb.podDetails.visited') : t('mweb.podDetails.joined')}
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
            {t('mweb.podDetails.backout')}
          </Button>
        )}
      </Stack>
      <ReleasedSeatsPanel
        releasedSeats={releasedSeats}
        canTakeSeatsBack={canTakeSeatsBack}
        restoringSpot={restoringSpot}
        onKeepSpot={onKeepSpot}
      />
      <MemberNote isExpired={isExpired} canBackout={canBackout} deductionPct={deductionPct} />
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
function ReleasedSeatsPanel({
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
    return <Alert severity="info">{t('mweb.podDetails.backoutLocked')}</Alert>;
  }
  const releasedKey =
    releasedSeats === 1 ? 'mweb.podDetails.releasedSeatsOne' : 'mweb.podDetails.releasedSeatsMany';
  return (
    <Stack spacing={1}>
      <Alert severity="warning">{t(releasedKey, { vars: { count: releasedSeats } })}</Alert>
      <Button
        variant="contained"
        onClick={onKeepSpot}
        disabled={restoringSpot}
        sx={{ fontWeight: 700 }}
      >
        {t('mweb.podDetails.takeSeatsBack')}
      </Button>
    </Stack>
  );
}

function MemberNote({
  isExpired,
  canBackout,
  deductionPct,
}: Readonly<{ isExpired: boolean; canBackout: boolean; deductionPct: number }>) {
  const { t } = useTranslation();
  if (canBackout) {
    return (
      <Typography variant="caption" sx={{
        color: "text.secondary"
      }}>
        {t('mweb.podDetails.backoutNote', { vars: { pct: deductionPct } })}
      </Typography>
    );
  }
  if (isExpired) {
    return (
      <Typography variant="caption" sx={{
        color: "text.secondary"
      }}>
        {t('mweb.podDetails.alreadyTakenPlace')}
      </Typography>
    );
  }
  return <Alert severity="info">{t('mweb.podDetails.backoutMaxed')}</Alert>;
}
