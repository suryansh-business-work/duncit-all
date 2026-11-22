import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { Link as RouterLink } from 'react-router';
import { Alert, Box, Link, Stack, Typography } from '@mui/material';
import { QueryGuard } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import { DuncitDashboard } from '@duncit/dashboard';
import RangeSelect, { useRangeParam } from '../ai-features/RangeSelect';
import { buildLibraryWidgets } from './widgets';
import { AI_LIBRARY_DASHBOARD, type LibraryDashboard } from './queries';

/**
 * AI Library › Dashboard — what the library holds, which code prompts drifted
 * from their code defaults, and how much the AI features behind each prompt
 * were used over the range (`?days=`, the same window as AI Features).
 */
export default function AiLibraryDashboardPage() {
  const { t } = useTranslation();
  const [rangeDays, setRangeDays] = useRangeParam();
  const { data, loading, error } = useQuery<{ aiLibraryDashboard: LibraryDashboard }>(AI_LIBRARY_DASHBOARD, {
    variables: { range_days: rangeDays },
    fetchPolicy: 'cache-and-network',
  });
  const d = data?.aiLibraryDashboard;
  const widgets = useMemo(() => (d ? buildLibraryWidgets(d, t) : []), [d, t]);

  const header = (
    <Stack spacing={2}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' } }}
      >
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
            {t('ai.libraryDashboard.title')}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('ai.libraryDashboard.subtitle')}
          </Typography>
          <Link component={RouterLink} to="/library" variant="body2">
            {t('ai.libraryDashboard.openLibrary')}
          </Link>
        </Box>
        <RangeSelect value={rangeDays} onChange={setRangeDays} />
      </Stack>
      {d && d.missing_code_prompts > 0 && (
        <Alert severity="info">
          {t('ai.libraryDashboard.missing', { vars: { count: d.missing_code_prompts } })}
        </Alert>
      )}
    </Stack>
  );

  if (!d) {
    return (
      <Stack spacing={3}>
        {header}
        <QueryGuard loading={loading} error={error} errorText={t('ai.libraryDashboard.loadFailed')} spinnerSx={{ py: 6 }}>
          {() => null}
        </QueryGuard>
      </Stack>
    );
  }
  return <DuncitDashboard dashboardId="ai.library" header={header} widgets={widgets} />;
}
