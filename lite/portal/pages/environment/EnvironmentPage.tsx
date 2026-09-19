import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { Box, Stack } from '@mui/material';
import { DuncitTabs, tabPanelProps, useTabParam, type DuncitTabItem } from '@duncit/tabs';
import { PageHeader, QueryGuard } from '@duncit/ui';
import { usePortalT } from '../../../shared/i18n';
import { LITE_ENV_CATEGORIES, type LiteEnvCategoryDef } from '../../graphql/environment';
import { EnvCategoryPanel } from './EnvCategoryPanel';

const TABS_ID = 'env-categories';

/** One tab per category the server defines; a category added server-side shows up with no console change. */
export function EnvironmentPage() {
  const { t } = usePortalT();
  const { data, loading, error } = useQuery<{ liteEnvCategories: LiteEnvCategoryDef[] }>(LITE_ENV_CATEGORIES, { fetchPolicy: 'cache-first' });
  const categories = useMemo(() => data?.liteEnvCategories ?? [], [data]);
  const items = useMemo<DuncitTabItem<string>[]>(
    () => categories.map((def) => ({ value: def.category, label: def.label, testId: `env-tab-${def.category.toLowerCase()}` })),
    [categories],
  );
  const tabs = useTabParam<string>({ items, fallback: categories[0]?.category ?? '' });
  const active = categories.find((def) => def.category === tabs.value);

  return (
    <Stack spacing={2}>
      <PageHeader title={t('litePortal.environment.title')} subtitle={t('litePortal.environment.subtitle')} />
      <QueryGuard loading={loading && !data} error={error} loadingLabel={t('lite.common.loading')}>
        <DuncitTabs {...tabs} idPrefix={TABS_ID} variant="scrollable" scrollButtons="auto" aria-label={t('litePortal.environment.tabs')} />
        {active && (
          <Box {...tabPanelProps(TABS_ID, active.category)}>
            {/* Keyed so the list, its query state and its dialogs reset with the tab. */}
            <EnvCategoryPanel key={active.category} def={active} />
          </Box>
        )}
      </QueryGuard>
    </Stack>
  );
}
