import { Link as RouterLink } from 'react-router';
import { Box, Stack, Typography } from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import { DuncitButton } from '@duncit/buttons';

import { useStoreSettings } from '../../../app/providers/StoreSettingsProvider';
import { NewsletterForm } from '../../../components/newsletter-form';
import { ProductSlider } from '../../../components/ProductSlider';
import { SectionHeading } from '../../../components/SectionHeading';
import { useMoney } from '../../../lib/money';
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

/** The "Free delivery above ₹X" strip with its pill. Hidden when delivery is never free. */
export function FreeDeliveryBanner() {
  const { t } = useStoreT();
  const money = useMoney();
  const { free_shipping_above: above } = useStoreSettings();
  if (above <= 0) return null;
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      sx={{ alignItems: { sm: 'center' }, bgcolor: T.surface, borderRadius: `${T.radius.card}px`, px: { xs: 2, md: 3 }, py: 2, boxShadow: T.shadow }}
    >
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexGrow: 1, minWidth: 0 }}>
        <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: T.brandTint, display: 'grid', placeItems: 'center', flexShrink: 0 }} aria-hidden>
          <LocalShippingOutlinedIcon sx={{ color: T.ctaInk }} />
        </Box>
        <Typography sx={{ fontWeight: 800 }}>{t('ecommStore.home.freeDelivery', { vars: { amount: money(above) } })}</Typography>
      </Stack>
      <DuncitButton
        component={RouterLink}
        to={paths.shop}
        variant="contained"
        endIcon={<ArrowForwardRoundedIcon aria-hidden />}
        sx={{ flexShrink: 0, whiteSpace: 'nowrap', alignSelf: { xs: 'flex-start', sm: 'center' } }}
      >
        {t('ecommStore.home.shopNow')}
      </DuncitButton>
    </Stack>
  );
}
