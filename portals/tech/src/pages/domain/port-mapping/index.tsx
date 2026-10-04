import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { useSearchParams } from 'react-router';
import { Alert, Stack } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { DuncitButton } from '@duncit/buttons';
import { PageHeader, QueryGuard } from '@duncit/ui';
import { formatDateTime, useTranslation } from '@duncit/app-settings';
import type { PortMapOverview } from '@duncit/gql-types';
import { PORT_MAPPINGS } from './queries';
import PortMapFilters from './PortMapFilters';
import PortMapCanvas from './PortMapCanvas';

function PortMapBody({ overview }: Readonly<{ overview: PortMapOverview }>) {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const site = params.get('site') ?? '';
  const domain = params.get('domain');

  const setParam = (key: string, value: string | null) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true }
    );

  const inSite = useMemo(
    () => overview.routes.filter((route) => !site || route.site === site),
    [overview.routes, site]
  );
  const domains = useMemo(() => [...new Set(inSite.map((route) => route.domain))], [inSite]);
  const shown = useMemo(() => inSite.filter((route) => !domain || route.domain === domain), [inSite, domain]);

  return (
    <Stack spacing={2}>
      <PortMapFilters
        sites={overview.sites}
        domains={domains}
        site={site}
        domain={domain}
        onSite={(value) => setParam('site', value)}
        onDomain={(value) => setParam('domain', value)}
      />
      {shown.length === 0 ? (
        <Alert severity="info" data-testid="port-map-empty">
          {t('tech.portMap.empty')}
        </Alert>
      ) : (
        <PortMapCanvas key={`${site}|${domain ?? ''}`} routes={shown} onSelectDomain={(value) => setParam('domain', value)} />
      )}
    </Stack>
  );
}

/**
 * Tech → Domain → Port Mapping: which domain nginx hands to which local port,
 * drawn as a graph from the host's sites-available on every load.
 */
export default function PortMappingPage() {
  const { t } = useTranslation();
  const { data, loading, error, refetch } = useQuery(PORT_MAPPINGS, { fetchPolicy: 'cache-and-network' });
  const overview = data?.portMappings;

  const subtitle = overview
    ? t('tech.portMap.subtitle', { vars: { time: formatDateTime(overview.checked_at) } })
    : undefined;

  return (
    <Stack spacing={3} data-testid="port-map-page">
      <PageHeader
        title={t('tech.portMap.pageTitle')}
        subtitle={subtitle}
        actions={
          <DuncitButton
            size="small"
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => refetch()}
            disabled={loading}
          >
            {t('tech.portMap.refresh')}
          </DuncitButton>
        }
      />
      <QueryGuard loading={loading && !data} error={error} errorText={error?.message}>
        {overview && !overview.available && (
          <Alert severity="warning" data-testid="port-map-unavailable">
            {t('tech.portMap.unavailable', { vars: { error: overview.error ?? '' } })}
          </Alert>
        )}
        {overview?.available && <PortMapBody overview={overview} />}
      </QueryGuard>
    </Stack>
  );
}
