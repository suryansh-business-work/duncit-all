import type { ReactNode } from 'react';
import { useQuery } from '@apollo/client/react';
import { Box, LinearProgress, Stack } from '@mui/material';
import { createLogger } from '@duncit/logs';
import { DuncitErrorBoundary } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import { ENV_CATEGORIES, type EnvCategoryDef } from '../queries';
import EnvVariablesTab from '../EnvVariablesTab';
import PortalMappingTab from '../PortalMappingTab';
import EnvSettingsTab from '../attempt-settings';
import SecretWarning from '../access-gate/SecretWarning';
import EnvSidebar from './EnvSidebar';
import EnvOverview from './EnvOverview';
import EnvSectionHeader from './EnvSectionHeader';
import { ENV_OVERVIEW } from './workspace-queries';
import { MAPPING, OVERVIEW, SETTINGS, useEnvSections } from './useEnvSections';

const logger = createLogger('portal');

/** Sidebar on the left (250px from `md` up), the chosen section on the right. */
export default function EnvWorkspace() {
  const { t } = useTranslation();
  const catalogue = useQuery<{ envCategories: EnvCategoryDef[] }>(ENV_CATEGORIES, { fetchPolicy: 'cache-first' });
  const overview = useQuery(ENV_OVERVIEW, { fetchPolicy: 'cache-and-network' });
  const categories = catalogue.data?.envCategories ?? [];
  const sections = useEnvSections(categories, overview.data?.envOverview?.categories ?? []);
  const { selected, category } = sections;

  let content: ReactNode;
  if (selected === OVERVIEW) {
    content = (
      <>
        <EnvSectionHeader title={t('tech.environment.overview')} subtitle={t('tech.environment.pageSubtitle')} />
        <EnvOverview
          overview={overview.data?.envOverview}
          loading={overview.loading}
          error={overview.error}
          categories={categories}
          onOpen={sections.select}
        />
      </>
    );
  } else if (selected === MAPPING) {
    content = (
      <>
        <EnvSectionHeader title={t('tech.environment.portalMapping')} subtitle={t('tech.environment.portalMappingSubtitle')} />
        <PortalMappingTab />
      </>
    );
  } else if (selected === SETTINGS) {
    content = <EnvSettingsTab />;
  } else if (category) {
    content = (
      <>
        <EnvSectionHeader
          title={category.label}
          subtitle={category.description}
          def={category}
          counts={sections.countOf(category.category)}
        />
        {/* key: a new category is a fresh table, form and test drawer. */}
        <EnvVariablesTab key={category.category} category={category.category} />
      </>
    );
  } else {
    content = <LinearProgress />;
  }

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: { md: 'flex-start' } }}>
      <EnvSidebar sections={sections} />
      <Box component="section" sx={{ flex: 1, minWidth: 0 }}>
        <Stack spacing={2}>
          <SecretWarning />
          <DuncitErrorBoundary logger={logger} surface="portal" scope="page" resetKey={selected}>
            <Stack spacing={2}>{content}</Stack>
          </DuncitErrorBoundary>
        </Stack>
      </Box>
    </Stack>
  );
}
