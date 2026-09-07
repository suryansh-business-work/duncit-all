import { Box, Chip, Link, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { SUITE_COLOR } from './cells';
import { durationLabel, type E2eSuiteResult, type E2eSuiteStatus } from './queries';

/**
 * What each leg did, failures first.
 *
 * The order is the point: a sweep of twenty suites is read to find the one that
 * broke, and alphabetical order buries it. Within a status the legs keep the
 * order they reported in, which is roughly the order they finished.
 */
const RANK: Record<E2eSuiteStatus, number> = { FAILED: 0, RUNNING: 1, PASSED: 2, SKIPPED: 3 };

interface Props {
  results: E2eSuiteResult[];
}

interface RowProps {
  result: E2eSuiteResult;
  statusLabel: string;
  countsLabel: string;
  jobLabel: string;
  watchLabel: string;
}

function SuiteRow({ result, statusLabel, countsLabel, jobLabel, watchLabel }: Readonly<RowProps>) {
  return (
    <Box
      sx={{
        borderTop: 1,
        borderColor: 'divider',
        py: 1.25,
        display: 'flex',
        gap: 1.5,
        alignItems: 'flex-start',
      }}
    >
      <Chip
        size="small"
        label={statusLabel}
        color={SUITE_COLOR[result.status]}
        variant={result.status === 'SKIPPED' ? 'outlined' : 'filled'}
        sx={{ minWidth: 84 }}
      />
      <Stack sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {result.key}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {countsLabel}
          </Typography>
          {result.job_url && (
            <Link
              href={result.job_url}
              target="_blank"
              rel="noopener noreferrer"
              variant="caption"
              underline="hover"
            >
              {jobLabel}
            </Link>
          )}
          {/* The recording lives in Slack, which is where it plays — this is a
              way back to it, not a second copy of it. A leg that recorded
              nothing, or a run that could not share what it recorded, simply
              has no link. */}
          {result.video_permalink && (
            <Link
              href={result.video_permalink}
              target="_blank"
              rel="noopener noreferrer"
              variant="caption"
              underline="hover"
            >
              {watchLabel}
            </Link>
          )}
        </Stack>
        {result.error && (
          <Typography variant="caption" sx={{ color: 'error.main', wordBreak: 'break-word' }}>
            {result.error}
          </Typography>
        )}
      </Stack>
    </Box>
  );
}

export default function SuiteResultsList({ results }: Readonly<Props>) {
  const { t } = useTranslation();
  const statusLabels: Record<E2eSuiteStatus, string> = {
    RUNNING: t('tech.e2e.suiteRunning'),
    PASSED: t('tech.e2e.suitePassed'),
    FAILED: t('tech.e2e.suiteFailed'),
    SKIPPED: t('tech.e2e.suiteSkipped'),
  };

  if (results.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('tech.e2e.noSuitesYet')}
      </Typography>
    );
  }

  // Copied before sorting — `results` belongs to the Apollo cache, and sorting
  // it in place would reorder the row the table is still rendering.
  const ordered = [...results].sort((a, b) => RANK[a.status] - RANK[b.status]);

  return (
    <Box>
      {ordered.map((result) => {
        // A leg that never wrote a JUnit report has no counts at all, which is
        // a different fact from "it ran nothing" and says so in words.
        const counts =
          result.tests === null
            ? t('tech.e2e.suiteNoCounts')
            : t('tech.e2e.suiteCounts', {
                vars: {
                  passed: String(result.passed ?? 0),
                  tests: String(result.tests),
                  specs: String(result.specs ?? 0),
                  duration: durationLabel(result),
                },
              });
        return (
          <SuiteRow
            key={result.key}
            result={result}
            statusLabel={statusLabels[result.status]}
            countsLabel={result.status === 'SKIPPED' ? t('tech.e2e.suiteNotSelected') : counts}
            jobLabel={t('tech.e2e.viewJob')}
            watchLabel={t('tech.e2e.watchRecording')}
          />
        );
      })}
    </Box>
  );
}
