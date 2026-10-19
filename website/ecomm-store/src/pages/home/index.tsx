import { Fragment } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Stack, Typography } from '@mui/material';
import { Loader } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';

import { useStoreSettings } from '../../app/providers/StoreSettingsProvider';
import { GreetingRibbon } from '../../components/festive';
import { STORE_HOME, type StoreHomeSection, type StoreSectionItem } from '../../graphql/catalog';
import { visuallyHidden } from '../../lib/a11y';
import { usePageSeo } from '../../lib/usePageSeo';
import { useStoreT } from '../../i18n';
import { HomeHeader } from './HomeHeader';
import { FreeDeliveryBanner, SECTION_RENDERERS } from './sections';

const PRODUCT_KINDS = new Set(['COLLECTION_CAROUSEL', 'PRODUCT_SLIDER']);
const TRUST_POINTS = 4;

function Section({ section, trust }: Readonly<{ section: StoreHomeSection; trust: readonly StoreSectionItem[] }>) {
  const Renderer = SECTION_RENDERERS[section.kind];
  return Renderer ? <Renderer section={section} trust={trust} /> : null;
}

/**
 * The home page: the operator's sections in their order, the occasion's
 * greeting over the first, and the free-delivery strip after the first
 * product rail. The hero's trust row reuses the first USP strip's points.
 */
export function HomePage() {
  const { t } = useStoreT();
  const settings = useStoreSettings();
  usePageSeo(settings.seo_title || settings.store_name, settings.seo_description);
  const { data, loading, error } = useQuery(STORE_HOME);
  const sections = data?.storeHome ?? [];
  const firstProducts = sections.find((s) => PRODUCT_KINDS.has(s.kind))?.id;
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
        <Fragment key={section.id}>
          <Section section={section} trust={trust} />
          {section.id === firstProducts ? <FreeDeliveryBanner /> : null}
        </Fragment>
      ))}
      {sections.length > 0 && !firstProducts ? <FreeDeliveryBanner /> : null}
    </Stack>
  );
}
