import { useEffect } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, LinearProgress, Stack } from '@mui/material';
import { notify } from '@duncit/dialogs';
import { SectionCard } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { IG_LEAD_SEARCHES, START_IG_LEAD_SEARCH, type IgLeadSearch } from '../queries';
import { LeadSearchForm, type LeadSearchFormValues } from '../lead-search-form';
import SearchRunList from './SearchRunList';

/** A run takes a minute or two; this is how often the page looks again meanwhile. */
const POLL_MS = 4000;

/**
 * Describe the leads wanted; the search runs in the background and its row
 * below fills in as it goes — the plan, then how many profiles came of it.
 */
export default function FindTab() {
  const { t } = useTranslation();
  const { data, loading, error, startPolling, stopPolling } = useQuery<{ igLeadSearches: IgLeadSearch[] }>(IG_LEAD_SEARCHES, {
    fetchPolicy: 'cache-and-network',
  });
  const [startMut] = useMutation<{ startIgLeadSearch: IgLeadSearch }>(START_IG_LEAD_SEARCH, { refetchQueries: ['IgLeadSearches'] });
  const searches = data?.igLeadSearches ?? [];
  const running = searches.some((search) => search.status === 'RUNNING');

  useEffect(() => {
    if (!running) return undefined;
    startPolling(POLL_MS);
    return stopPolling;
  }, [running, startPolling, stopPolling]);

  const start = async (values: LeadSearchFormValues) => {
    try {
      await startMut({ variables: { input: { brief: values.brief, max_results: values.max_results } } });
      notify(t('marketing.igLeads.searchStarted'), 'success');
      return true;
    } catch (err) {
      notify(parseApiError(err), 'error');
      return false;
    }
  };

  return (
    <Stack spacing={2} data-testid="ig-leads-find">
      <SectionCard title={t('marketing.igLeads.findTitle')} subtitle={t('marketing.igLeads.findSubtitle')}>
        <LeadSearchForm disabled={running} onSubmit={start} />
      </SectionCard>
      {loading && searches.length === 0 && <LinearProgress />}
      {error && <Alert severity="error">{parseApiError(error)}</Alert>}
      <SearchRunList searches={searches} />
    </Stack>
  );
}
