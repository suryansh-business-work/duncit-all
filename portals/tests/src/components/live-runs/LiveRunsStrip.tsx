import { useId } from 'react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import LiveRunCard from './LiveRunCard';
import { useLiveRuns } from './useLiveRun';

/** A card never narrower than this many theme spacing units, so the bar and its words keep room. */
const CARD_MIN_UNITS = 40;

/**
 * Every unit, E2E and stress run going right now, above whatever page is open —
 * so "is anything running, and how far along is it?" is answered everywhere in
 * the console without opening a single table. Nothing renders while nothing runs.
 */
export default function LiveRunsStrip() {
  const { t } = useTranslation();
  const runs = useLiveRuns();
  const headingId = useId();
  if (runs.length === 0) return null;

  return (
    <Box component="section" aria-labelledby={headingId} sx={{ mb: 3 }}>
      <Typography id={headingId} variant="overline" component="h2" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
        {t('tests.live.title')}
      </Typography>
      <Box
        sx={(theme) => ({
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${theme.spacing(CARD_MIN_UNITS)}), 1fr))`,
        })}
      >
        {runs.map((run) => (
          <LiveRunCard key={`${run.kind}:${run.run_id}`} run={run} />
        ))}
      </Box>
    </Box>
  );
}
