import { Fragment } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Box, Stack, Typography } from '@mui/material';
import { useDateFormat } from '@duncit/app-settings';
import { Loader } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';

import { useStoreSettings } from '../../app/providers/StoreSettingsProvider';
import { STORE_HOME, type StoreHomeSection } from '../../graphql/catalog';
import { visuallyHidden } from '../../lib/a11y';
import { usePageSeo } from '../../lib/usePageSeo';
import { useStoreT } from '../../i18n';
import { HomeHeader } from './HomeHeader';
import { FreeDeliveryBanner, SECTION_RENDERERS } from './sections';

const PRODUCT_KINDS = new Set(['COLLECTION_CAROUSEL', 'PRODUCT_SLIDER']);

function Section({ section }: Readonly<{ section: StoreHomeSection }>) {
  const Renderer = SECTION_RENDERERS[section.kind];
  return Renderer ? <Renderer section={section} /> : null;
}

/**
 * On a desktop the first hero and a live flash sale sit side by side at the
 * top; on a phone every section simply stacks in the operator's order.
 */
function TopPair({ hero, flash }: Readonly<{ hero: StoreHomeSection; flash: StoreHomeSection }>) {
  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ alignItems: 'flex-start' }}>
      <Box sx={{ flex: { md: '3 1 0' }, minWidth: 0, width: '100%' }}>
        <Section section={hero} />
      </Box>
      <Box sx={{ flex: { md: '2 1 0' }, minWidth: 0, width: '100%' }}>
        <Section section={flash} />
      </Box>
    </Stack>
  );
}

export function HomePage() {
  const { t } = useStoreT();
  const settings = useStoreSettings();
  const { now } = useDateFormat();
  usePageSeo(settings.seo_title || settings.store_name, settings.seo_description);
  const { data, loading, error } = useQuery(STORE_HOME);
  const sections = data?.storeHome ?? [];
  const hero = sections.find((s) => s.kind === 'HERO_SLIDER');
  const flash = sections.find((s) => s.kind === 'FLASH_SALE' && !(s.ends_at && Date.parse(s.ends_at) <= now().getTime()));
  const paired = hero && flash ? new Set([hero.id, flash.id]) : null;
  const firstProducts = sections.find((s) => PRODUCT_KINDS.has(s.kind))?.id;

  return (
    <Stack spacing={{ xs: 3, md: 5 }}>
      <HomeHeader />
      <Typography component="h1" sx={{ ...visuallyHidden, display: { xs: 'none', md: 'block' } }}>
        {settings.seo_title || settings.store_name}
      </Typography>
      {loading && sections.length === 0 ? <Loader label={t('ecommStore.common.loading')} /> : null}
      {error ? <Alert severity="error">{parseApiError(error, t('ecommStore.common.loadFailed'))}</Alert> : null}
      {sections.map((section) => {
        if (paired?.has(section.id)) {
          if (!hero || !flash || section.id !== sections.find((s) => paired.has(s.id))?.id) return null;
          return <TopPair key={section.id} hero={hero} flash={flash} />;
        }
        return (
          <Fragment key={section.id}>
            <Section section={section} />
            {section.id === firstProducts ? <FreeDeliveryBanner /> : null}
          </Fragment>
        );
      })}
      {sections.length > 0 && !firstProducts ? <FreeDeliveryBanner /> : null}
    </Stack>
  );
}
