import { useParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Alert, LinearProgress, Stack, Typography } from '@mui/material';
import { QueryGuard } from '@duncit/ui';
import type { LiteEvent } from '../../../shared/graphql/documents';
import { useWebT } from '../../../shared/i18n';
import { SignedInGate } from '../../components/SignedInGate';
import { LITE_EVENT } from '../../graphql/events';
import { usePageTitle } from '../../lib/usePageTitle';
import { NotFoundPage } from '../not-found';
import { ScannerPanel } from './ScannerPanel';

/** "12 of 40 checked in", with a bar, kept current as the door scans. */
function Tally({ event }: Readonly<{ event: LiteEvent }>) {
  const { t } = useWebT();
  const { checked_in: checked, going } = event.stats;
  return (
    <Stack spacing={1} data-testid="scan-tally">
      <Typography variant="body2" color="text.secondary" aria-live="polite">
        {t('liteWeb.manage.checkIn.count', { vars: { checked, going } })}
      </Typography>
      <LinearProgress variant="determinate" value={going > 0 ? Math.min(100, (checked / going) * 100) : 0} color="success" aria-label={t('liteWeb.scan.progress')} />
    </Stack>
  );
}

function Scanner({ slug }: Readonly<{ slug: string }>) {
  const { t } = useWebT();
  const { data, loading, error, refetch } = useQuery(LITE_EVENT, { variables: { slug }, fetchPolicy: 'cache-and-network' });
  const event = data?.liteEvent ?? null;
  if (!loading && !error && !event) return <NotFoundPage />;
  return (
    <QueryGuard loading={loading && !event} error={error} loadingLabel={t('lite.common.loading')}>
      {() => {
        if (!event) return null;
        if (!event.viewer_is_host) {
          return (
            <Alert severity="info" data-testid="scan-not-host">
              {t('liteWeb.scan.hostsOnly')}
            </Alert>
          );
        }
        return (
          <Stack spacing={3}>
            <Stack spacing={0.5}>
              <Typography variant="body2" color="text.secondary">
                {t('liteWeb.scan.title')}
              </Typography>
              <Typography variant="h2" component="h1">
                {event.title}
              </Typography>
            </Stack>
            <Tally event={event} />
            <ScannerPanel
              event={event}
              onChecked={() => {
                // The door keeps scanning even if the tally cannot refresh; the next scan refreshes it again.
                refetch().catch((error: unknown) => console.warn('[lite] check-in tally refresh failed', error));
              }}
            />
          </Stack>
        );
      }}
    </QueryGuard>
  );
}

/** /e/:slug/scan — the door scanner a host (or co-host) opens on their phone. */
export function ScanPage() {
  const { t } = useWebT();
  const { slug = '' } = useParams();
  usePageTitle(t('liteWeb.scan.title'));
  return (
    <Stack sx={{ maxWidth: 520, mx: 'auto' }} data-testid="scan-page">
      <SignedInGate body={t('liteWeb.scan.gate')}>
        <Scanner slug={slug} />
      </SignedInGate>
    </Stack>
  );
}
