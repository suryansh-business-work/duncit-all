import { Box, Stack, Typography } from '@mui/material';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import { useTranslation, type Translator } from '@duncit/app-settings';
import type { PreviewSummary } from '@duncit/slots';

const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

interface Props {
  summary: PreviewSummary;
  maxAdvanceDays: number;
}

/** The "auto-skipped" line: only the reasons that skipped something. */
function skipLines(summary: PreviewSummary, maxAdvanceDays: number, t: Translator['t']): string[] {
  const skips: string[] = [];
  if (summary.skippedWeeklyOff) {
    skips.push(t('availability.recurring.preview.skipWeeklyOff', { vars: { count: summary.skippedWeeklyOff } }));
  }
  if (summary.skippedHolidays) {
    skips.push(t('availability.recurring.preview.skipHoliday', { vars: { count: summary.skippedHolidays } }));
  }
  if (summary.skippedPast) {
    skips.push(t('availability.recurring.preview.skipPast', { vars: { count: summary.skippedPast } }));
  }
  if (summary.skippedBeyondCap) {
    skips.push(
      t('availability.recurring.preview.skipBeyondCap', {
        vars: { count: summary.skippedBeyondCap, days: maxAdvanceDays },
      }),
    );
  }
  return skips;
}

export default function PreviewBar({ summary, maxAdvanceDays }: Readonly<Props>) {
  const { t } = useTranslation();
  const spaceLabels = Object.keys(summary.bySpace).sort((a, b) => a.localeCompare(b));
  const skips = skipLines(summary, maxAdvanceDays, t);

  return (
    <Box
      aria-live="polite"
      sx={{ p: 2, borderRadius: 2, bgcolor: 'action.hover', border: 1, borderColor: 'divider' }}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        sx={{ alignItems: { xs: 'flex-start', md: 'center' }, justifyContent: 'space-between' }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Box
            sx={{
              width: 46,
              height: 46,
              borderRadius: 2,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <EventAvailableIcon />
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800 }}>
              {t('availability.recurring.preview.slotsToCreate')}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 950, color: 'primary.main', lineHeight: 1.05 }}>
              {t('availability.recurring.preview.slotsCount', { vars: { count: summary.total } })}
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={2.5} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
          {spaceLabels.map((label) => (
            <Box key={label || 'whole-venue'}>
              <Typography variant="caption" sx={{ fontWeight: 800 }}>
                {label || t('availability.wholeVenue')}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 900 }}>
                {t('availability.recurring.preview.slotsCount', { vars: { count: summary.bySpace[label].count } })}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {t('availability.recurring.preview.priceCap', {
                  vars: { price: fmt(summary.bySpace[label].price), capacity: summary.bySpace[label].capacity },
                })}
              </Typography>
            </Box>
          ))}
        </Stack>

        <Box sx={{ textAlign: { md: 'right' } }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800 }}>
            {t('availability.recurring.preview.totalRevenue')}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 950 }}>
            {fmt(summary.estimatedRevenue)}
          </Typography>
        </Box>
      </Stack>
      {skips.length > 0 && (
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>
          {t('availability.recurring.preview.autoSkipped', { vars: { list: skips.join(' · ') } })}
        </Typography>
      )}
    </Box>
  );
}
