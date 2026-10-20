import { Box, Stack, Typography } from '@mui/material';

import { NewsletterForm } from '../../../components/newsletter-form';
import { ProductSlider } from '../../../components/ProductSlider';
import { SectionHeading } from '../../../components/SectionHeading';
import { paths } from '../../../lib/paths';
import { useStoreT } from '../../../i18n';
import { STORE_TOKENS as T } from '../../../theme/tokens';
import type { SectionProps } from './types';

/** A collection's products — "Bestseller Products", as a four-up rail. */
export function CollectionSection({ section }: Readonly<SectionProps>) {
  const { t } = useStoreT();
  if (section.products.length === 0) return null;
  const title = section.title || section.collection?.name || t('ecommStore.home.bestSelling');
  const viewAll = section.collection ? paths.collection(section.collection.slug) : paths.shop;
  return (
    <Box component="section" aria-label={title}>
      <SectionHeading title={title} subtitle={section.subtitle} viewAll={viewAll} />
      <ProductSlider products={section.products.slice(0, 12)} label={title} />
    </Box>
  );
}

export function NewsletterSection({ section }: Readonly<SectionProps>) {
  const { t } = useStoreT();
  const title = section.title || t('ecommStore.footer.newsletter');
  return (
    <Stack
      component="section"
      aria-label={title}
      spacing={1.5}
      sx={{ bgcolor: T.brandTint, borderRadius: `${T.radius.card}px`, p: { xs: 3, md: 6 }, alignItems: { md: 'center' }, textAlign: { md: 'center' } }}
    >
      <Typography variant="h2" component="h2" sx={{ fontWeight: 800 }}>
        {title}
      </Typography>
      <Typography color="text.secondary">{section.subtitle || t('ecommStore.newsletter.pitch')}</Typography>
      <Box sx={{ width: '100%', maxWidth: 480, textAlign: 'start' }}>
        <NewsletterForm source="WEBSITE_PAGE" />
      </Box>
    </Stack>
  );
}
