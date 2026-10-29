import { Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { freeReasonKey } from '@duncit/utils';
import type { OfferFreeJustification } from './queries';

/**
 * Why the host asked for the venue free — "Requested free — Promotional offer:
 * launch week" — so the venue weighs the reason before it accepts or declines.
 * Nothing on a priced offer, or for a reason this client does not know.
 */
export default function FreeJustificationNote({ justification }: Readonly<{ justification?: OfferFreeJustification | null }>) {
  const { t } = useTranslation();
  if (!justification) return null;
  const reasonKey = freeReasonKey(justification.reason);
  if (!reasonKey) return null;
  const vars = { reason: t(reasonKey), details: justification.details };

  return (
    <Typography variant="body2" sx={{ fontWeight: 700, overflowWrap: 'anywhere' }} data-testid="offer-free-reason">
      {justification.details
        ? t('availability.freeArrangement.venueNoteDetails', { vars })
        : t('availability.freeArrangement.venueNote', { vars })}
    </Typography>
  );
}
