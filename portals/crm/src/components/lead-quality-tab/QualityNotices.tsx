import { Alert, AlertTitle, Box, Stack } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import type { LeadQualityDetails } from '../../api/leadQuality.gql';

interface Props {
  details: LeadQualityDetails;
  /** Automatic checks the last recalculation or evidence save could not run, and why. */
  skipped: readonly string[];
  /** The last recalculation's failure, already worded for the reader. */
  error: string;
}

/** What the reader should know before trusting the number: not scored, out of date, checks skipped, a failed recalculation. */
export default function QualityNotices({ details, skipped, error }: Readonly<Props>) {
  const { t } = useTranslation();
  const notScored = !details.result;
  const stale = !notScored && details.stale;
  if (!notScored && !stale && skipped.length === 0 && !error) return null;
  return (
    <Stack spacing={1} sx={{ mt: 2 }}>
      {error && <Alert severity="error">{error}</Alert>}
      {notScored && (
        <Alert severity="info" data-testid="lead-quality-not-scored">
          {t('crm.leadQualityTab.notScoredYet')}
        </Alert>
      )}
      {stale && (
        <Alert severity="warning" data-testid="lead-quality-stale">
          {t('crm.leadQualityTab.staleScore', {
            vars: { scored: details.scored_version ?? '—', published: details.published_version },
          })}
        </Alert>
      )}
      {skipped.length > 0 && (
        <Alert severity="warning" data-testid="lead-quality-skipped">
          <AlertTitle>{t('crm.leadQualityTab.skippedTitle')}</AlertTitle>
          <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
            {skipped.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </Box>
        </Alert>
      )}
    </Stack>
  );
}
