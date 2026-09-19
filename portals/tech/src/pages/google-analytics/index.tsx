import { useQuery } from '@apollo/client/react';
import { Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { PageHeader, QueryGuard } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import type { GoogleAnalyticsSite } from '@duncit/gql-types';
import GoogleAnalyticsTable from './GoogleAnalyticsTable';
import GoogleAnalyticsDialog from './GoogleAnalyticsDialog';
import { useGoogleAnalyticsActions } from './useGoogleAnalyticsActions';
import { GOOGLE_ANALYTICS_SITES } from './queries';

function SiteTags({ sites }: Readonly<{ sites: readonly GoogleAnalyticsSite[] }>) {
  const { t } = useTranslation();
  const actions = useGoogleAnalyticsActions(sites);
  return (
    <>
      <GoogleAnalyticsTable
        sites={sites}
        onEdit={actions.openEdit}
        onDelete={actions.remove}
        toolbarActions={
          <DuncitButton
            size="small"
            variant="contained"
            startIcon={<AddIcon />}
            disabled={!actions.canAdd}
            onClick={actions.openCreate}
            data-testid="google-analytics-add"
          >
            {t('tech.googleAnalytics.addTag')}
          </DuncitButton>
        }
      />
      {actions.dialog && (
        <GoogleAnalyticsDialog
          state={actions.dialog}
          saving={actions.saving}
          opError={actions.opError}
          onClose={actions.close}
          onSubmit={actions.submit}
        />
      )}
    </>
  );
}

/** Tech → Google Analytics: the GA4 tag each Duncit website loads, one per website. */
export default function GoogleAnalyticsPage() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery(GOOGLE_ANALYTICS_SITES, { fetchPolicy: 'cache-and-network' });

  return (
    <Stack spacing={3} data-testid="google-analytics-page">
      <PageHeader title={t('shell.nav.googleAnalytics')} subtitle={t('tech.googleAnalytics.subtitle')} />
      <QueryGuard loading={loading && !data} error={error} errorText={error?.message}>
        {data && <SiteTags sites={data.googleAnalyticsSites} />}
      </QueryGuard>
    </Stack>
  );
}
