import { useCallback, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Box, Stack } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { DuncitButton } from '@duncit/buttons';
import { PageHeader, QueryGuard, StatCard } from '@duncit/ui';
import { formatDateTime, useTranslation } from '@duncit/app-settings';
import type { SslCertificate, SslOverview } from '@duncit/gql-types';
import { EXPIRY_COLOR } from '../domain/overview/expiry';
import { sslExpiryLevel } from './expiry';
import { SSL_CERTIFICATES } from './queries';
import SslCertificatesTable from './SslCertificatesTable';
import SslCertificateDialog from './SslCertificateDialog';

const GRID = {
  display: 'grid',
  gap: 2,
  gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
} as const;

/** The certificates a visitor is about to hit a TLS error on — expired, or past the point auto-renew should have fired. */
const atRisk = (certs: SslCertificate[]) => certs.filter((c) => sslExpiryLevel(c.days_remaining) !== 'HEALTHY');

function SslSummary({ overview }: Readonly<{ overview: SslOverview }>) {
  const { t } = useTranslation();
  const certs = overview.certificates;
  const soonest = certs[0];
  const risky = atRisk(certs);
  return (
    <Stack spacing={2}>
      {risky.length > 0 && (
        <Alert severity="error" data-testid="ssl-risk-banner">
          {t('tech.ssl.bannerAtRisk', { vars: { names: risky.map((c) => c.name).join(', ') } })}
        </Alert>
      )}
      <Box sx={GRID}>
        <StatCard label={t('tech.ssl.statCertificates')} value={String(certs.length)} testId="ssl-stat-count" />
        <StatCard
          label={t('tech.ssl.statSoonest')}
          value={soonest ? String(soonest.days_remaining) : '—'}
          valueColor={soonest ? EXPIRY_COLOR[sslExpiryLevel(soonest.days_remaining)] : undefined}
          hint={soonest?.name}
          testId="ssl-stat-soonest"
        />
        <StatCard
          label={t('tech.ssl.statHosts')}
          value={String(certs.reduce((sum, c) => sum + c.domains.length, 0))}
          testId="ssl-stat-hosts"
        />
      </Box>
    </Stack>
  );
}

/**
 * Tech → SSL: every TLS certificate certbot holds on the VPS — its expiry, key
 * type, coverage and renewal method — and, per certificate, what each of its
 * hosts actually serves.
 */
export default function SslPage() {
  const { t } = useTranslation();
  const { data, loading, error, refetch } = useQuery(SSL_CERTIFICATES, { fetchPolicy: 'cache-and-network' });
  const overview = data?.sslCertificates;
  const [selected, setSelected] = useState<SslCertificate | null>(null);
  const onDetails = useCallback((row: SslCertificate) => setSelected(row), []);

  const subtitle = overview
    ? t('tech.ssl.subtitle', { vars: { time: formatDateTime(overview.checked_at) } })
    : undefined;

  return (
    <Stack spacing={3} data-testid="ssl-page">
      <PageHeader
        title={t('tech.ssl.pageTitle')}
        subtitle={subtitle}
        actions={
          <DuncitButton
            size="small"
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => refetch()}
            disabled={loading}
          >
            {t('tech.ssl.refresh')}
          </DuncitButton>
        }
      />
      <QueryGuard loading={loading && !data} error={error} errorText={error?.message}>
        {overview && !overview.available && (
          <Alert severity="warning" data-testid="ssl-unavailable">
            {t('tech.ssl.unavailable', { vars: { error: overview.error ?? '' } })}
          </Alert>
        )}
        {overview?.available && (
          <Stack spacing={3}>
            <SslSummary overview={overview} />
            <SslCertificatesTable certificates={overview.certificates} onDetails={onDetails} />
          </Stack>
        )}
      </QueryGuard>
      <SslCertificateDialog cert={selected} onClose={() => setSelected(null)} />
    </Stack>
  );
}
