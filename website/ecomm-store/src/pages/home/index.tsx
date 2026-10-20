import { useQuery } from '@apollo/client/react';
import { Alert, Stack, Typography } from '@mui/material';
import { Loader } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';

import { useStoreSettings } from '../../app/providers/StoreSettingsProvider';
import { GreetingRibbon } from '../../components/festive';
import { STORE_HOME } from '../../graphql/catalog';
import { visuallyHidden } from '../../lib/a11y';
import { usePageSeo } from '../../lib/usePageSeo';
import { useStoreT } from '../../i18n';
import { HomeHeader } from './HomeHeader';
import { Section } from './sections';

const TRUST_POINTS = 4;

/**
 * The home page: the operator's sections in their order (the free-delivery
 * strip is one of them, wherever it was placed), with the occasion's greeting
 * over the first. The hero's trust row reuses the first USP strip's points.
 */
export function HomePage() {
  const { t } = useStoreT();
  const settings = useStoreSettings();
  usePageSeo(settings.seo_title || settings.store_name, settings.seo_description);
  const { data, loading, error } = useQuery(STORE_HOME);
  const sections = data?.storeHome ?? [];
  const trust = sections.find((s) => s.kind === 'USP_STRIP')?.items.slice(0, TRUST_POINTS) ?? [];

  return (
    <Stack spacing={{ xs: 4, md: 7 }}>
      <HomeHeader />
      <Typography component="h1" sx={{ ...visuallyHidden, display: { xs: 'none', md: 'block' } }}>
        {settings.seo_title || settings.store_name}
      </Typography>
      <GreetingRibbon />
      {loading && sections.length === 0 ? <Loader label={t('ecommStore.common.loading')} /> : null}
      {error ? <Alert severity="error">{parseApiError(error, t('ecommStore.common.loadFailed'))}</Alert> : null}
      {sections.map((section) => (
        <Section key={section.id} section={section} trust={trust} />
      ))}
    </Stack>
  );
}
