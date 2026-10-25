import { useId } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import { useDateFormat, useTranslation } from '@duncit/app-settings';

interface AskProps {
  /** What the venue provides for the money, one point each. */
  offerings: readonly string[];
  note: string;
  /** Whose terms these are — the note reads "from the host" or "from the venue". */
  by: string;
}

/** What one side's terms ask beside the price: the points as a list, and their note. Nothing when there is neither. */
export function OfferAsk({ offerings, note, by }: Readonly<AskProps>) {
  const { t } = useTranslation();
  const listId = useId();
  // A point said twice reads once.
  const points = [...new Set(offerings)];
  if (points.length === 0 && !note) return null;

  return (
    <Stack spacing={0.75} data-testid="offer-ask">
      {points.length > 0 && (
        <Box>
          <Typography id={listId} variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
            {t('availability.offers.offeringsLabel')}
          </Typography>
          <Box component="ul" aria-labelledby={listId} sx={{ m: 0, pl: 2.5 }}>
            {points.map((point) => (
              <Typography key={point} component="li" variant="body2" sx={{ overflowWrap: 'anywhere' }}>
                {point}
              </Typography>
            ))}
          </Box>
        </Box>
      )}
      {note && (
        <Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
            {by === 'VENUE' ? t('availability.offers.venueNote') : t('availability.offers.hostNote')}
          </Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
            {note}
          </Typography>
        </Box>
      )}
    </Stack>
  );
}

/** "Answer by 5 Dec, 18:00" — when the side whose move it is must answer before the offer runs out. */
export function OfferAnswerBy({ at }: Readonly<{ at: string | null | undefined }>) {
  const { t } = useTranslation();
  const fmt = useDateFormat({ timeZoneAware: true });
  if (!at) return null;

  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: 'text.secondary' }} data-testid="offer-answer-by">
      <ScheduleRoundedIcon fontSize="small" aria-hidden />
      <Typography variant="caption" sx={{ fontWeight: 700 }}>
        {t('availability.offers.answerBy', { vars: { date: fmt.formatDateTime(at) } })}
      </Typography>
    </Stack>
  );
}
