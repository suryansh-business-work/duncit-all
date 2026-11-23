import { useMutation } from '@apollo/client/react';
import SyncIcon from '@mui/icons-material/Sync';
import { useTranslation } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { APP_INSIGHTS_STATUS, SYNC_APP_INSIGHTS, type AppInsightStore } from './queries';

interface Props {
  /** One store, or null for both. */
  store: AppInsightStore | null;
  /** True while a sync runs or nothing is configured to sync. */
  disabled: boolean;
}

/**
 * Sync now: asks the server to read the stores' latest reports. The sync runs
 * in the background — a first one can take minutes — so the press answers at
 * once, the status cards turn to Syncing, and the page refreshes itself when
 * it finishes. A refusal (synced moments ago, already syncing) is said in the
 * server's words.
 */
export default function SyncButton({ store, disabled }: Readonly<Props>) {
  const { t } = useTranslation();
  const [sync, { loading }] = useMutation(SYNC_APP_INSIGHTS, {
    update(cache, { data }) {
      if (data) cache.writeQuery({ query: APP_INSIGHTS_STATUS, data: { appInsightsStatus: data.syncAppInsights } });
    },
  });
  const press = () => {
    sync({ variables: { store } })
      .then(() => notifySuccess(t('analytics.appInsights.sync.started')))
      .catch((error: unknown) => notifyError(parseApiError(error)));
  };
  return (
    <DuncitButton
      size="small"
      variant="contained"
      startIcon={<SyncIcon fontSize="small" />}
      onClick={press}
      loading={loading}
      disabled={disabled}
      data-testid="app-insights-sync"
    >
      {t('analytics.appInsights.sync.now')}
    </DuncitButton>
  );
}
