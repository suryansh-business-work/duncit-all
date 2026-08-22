import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, Button, Stack } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { PageHeader, QueryGuard } from '@duncit/ui';
import { DuncitTabs, useTabParam } from '@duncit/tabs';
import { useTranslation } from '@duncit/app-settings';
import PackagesTable from './PackagesTable';
import DependenciesTable from './DependenciesTable';
import PackageDepsDialog from './PackageDepsDialog';
import ReportSummary from './ReportSummary';
import {
  PACKAGE_UPDATES,
  REFRESH_PACKAGE_UPDATES,
  groupDependencies,
  type PackageUpdate,
  type PackageUpdatesReport,
} from './queries';

type TabKey = 'packages' | 'dependencies';

/** Stable identity: a fresh `[]` each render would rebuild both tables' rows. */
const NO_PACKAGES: PackageUpdate[] = [];

/**
 * Package Updates — every `package.json` in the repo beside what npm publishes.
 *
 * Two readings of the same sweep: BY MANIFEST, which answers "which surface is
 * furthest behind" and is where an upgrade is actually done, and BY DEPENDENCY,
 * which answers "what is there to upgrade" and exposes the same package pinned
 * to two different ranges in two places.
 */
export default function PackageUpdatesPage() {
  const { t } = useTranslation();
  const [openPkg, setOpenPkg] = useState<PackageUpdate | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const { data, loading, error, refetch } = useQuery<{ techPackageUpdates: PackageUpdatesReport }>(
    PACKAGE_UPDATES,
    { fetchPolicy: 'cache-and-network' },
  );
  const [refresh] = useMutation(REFRESH_PACKAGE_UPDATES);

  const report = data?.techPackageUpdates;
  const packages = report?.packages ?? NO_PACKAGES;
  const groups = useMemo(() => groupDependencies(packages), [packages]);

  const items = useMemo(
    () => [
      { value: 'packages' as TabKey, label: t('tech.packageUpdates.tabPackages') },
      { value: 'dependencies' as TabKey, label: t('tech.packageUpdates.tabDependencies') },
    ],
    [t],
  );
  const tabs = useTabParam<TabKey>({ items, fallback: 'packages' });

  const handleRefresh = async () => {
    setRefreshError(null);
    setRefreshing(true);
    try {
      await refresh();
      await refetch();
    } catch (err) {
      setRefreshError(err instanceof Error ? err.message : String(err));
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Stack spacing={2.5}>
      <PageHeader
        title={t('tech.packageUpdates.packageUpdates')}
        subtitle={t('tech.packageUpdates.everyManifestAgainstNpm')}
        actions={
          <Button
            size="small"
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? t('tech.packageUpdates.checking') : t('tech.packageUpdates.checkNow')}
          </Button>
        }
      />

      {refreshError && (
        <Alert severity="error" onClose={() => setRefreshError(null)}>
          {refreshError}
        </Alert>
      )}

      {report?.error && (
        <Alert severity="warning">
          {t('tech.packageUpdates.registryUnreachable')} — {report.error}
        </Alert>
      )}

      <QueryGuard
        loading={loading && !report}
        error={error}
        errorText={error?.message}
        spinnerSx={{ py: 6 }}
      >
        {() =>
          report && (
            <Stack spacing={2.5}>
              <ReportSummary report={report} />
              <DuncitTabs {...tabs} />
              {tabs.value === 'packages' ? (
                <PackagesTable packages={packages} onOpen={setOpenPkg} />
              ) : (
                <DependenciesTable groups={groups} />
              )}
            </Stack>
          )
        }
      </QueryGuard>

      <PackageDepsDialog pkg={openPkg} onClose={() => setOpenPkg(null)} />
    </Stack>
  );
}
