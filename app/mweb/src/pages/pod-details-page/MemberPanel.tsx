import { Alert, Button, Stack, Typography } from '@mui/material';
import { compactButtonSx } from './buttonSx';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  /** The pod's own date has passed — nothing about the seat can change now. */
  isExpired: boolean;
  canBackout: boolean;
  backingOut: boolean;
  deductionPct: number;
  onBackout: () => void;
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
  onBackout,
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
      <MemberNote isExpired={isExpired} canBackout={canBackout} deductionPct={deductionPct} />
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
      <Typography variant="caption" color="text.secondary">
        {t('mweb.podDetails.backoutNote', { vars: { pct: deductionPct } })}
      </Typography>
    );
  }
  if (isExpired) {
    return (
      <Typography variant="caption" color="text.secondary">
        {t('mweb.podDetails.alreadyTakenPlace')}
      </Typography>
    );
  }
  return <Alert severity="info">{t('mweb.podDetails.backoutMaxed')}</Alert>;
}
