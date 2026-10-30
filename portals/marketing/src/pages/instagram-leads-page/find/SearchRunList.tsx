import { Alert, Chip, LinearProgress, Stack, Typography } from '@mui/material';
import { SectionCard } from '@duncit/ui';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { SEARCH_STATUS_LABEL } from '../copy';
import type { IgLeadSearch, IgLeadSearchStatus } from '../queries';

const STATUS_COLOR: Record<IgLeadSearchStatus, 'info' | 'success' | 'error'> = {
  RUNNING: 'info',
  DONE: 'success',
  FAILED: 'error',
};

/** The latest runs, newest first: the brief, the AI's reading of it, and what came of it. */
export default function SearchRunList({ searches }: Readonly<{ searches: IgLeadSearch[] }>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat({ timeZoneAware: true });

  if (searches.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        {t('marketing.igLeads.noSearches')}
      </Typography>
    );
  }

  return (
    <Stack spacing={1.5} component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }} aria-live="polite">
      {searches.map((search) => (
        <li key={search.id}>
          <SectionCard
            title={search.brief}
            subtitle={search.created_at ? formatDateTime(search.created_at) : undefined}
            action={<Chip size="small" color={STATUS_COLOR[search.status]} label={t(SEARCH_STATUS_LABEL[search.status])} />}
          >
            <Stack spacing={1}>
              {search.status === 'RUNNING' && <LinearProgress aria-label={t('marketing.igLeads.searchRunning')} />}
              {search.summary && <Typography variant="body2">{search.summary}</Typography>}
              {search.queries.length > 0 && (
                <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
                  {search.queries.map((query) => (
                    <Chip key={query} size="small" variant="outlined" label={query} />
                  ))}
                </Stack>
              )}
              {search.status === 'DONE' && (
                <Typography variant="body2" color="text.secondary">
                  {t('marketing.igLeads.searchResult', { vars: { found: search.found, added: search.added, skipped: search.skipped } })}
                </Typography>
              )}
              {search.status === 'FAILED' && <Alert severity="error">{search.error}</Alert>}
            </Stack>
          </SectionCard>
        </li>
      ))}
    </Stack>
  );
}
