import { Link as RouterLink } from 'react-router';
import { Box, Stack, Typography } from '@mui/material';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import { DuncitButton } from '@duncit/buttons';

import { useStoreSettings } from '../../../app/providers/StoreSettingsProvider';
import { NewsletterForm } from '../../../components/newsletter-form';
import { ProductGrid } from '../../../components/ProductGrid';
import { SectionHeading } from '../../../components/SectionHeading';
import { SmartLink } from '../../../components/SmartLink';
import { StoreImage } from '../../../components/StoreImage';
import { useMoney } from '../../../lib/money';
import { paths } from '../../../lib/paths';
import { useStoreT } from '../../../i18n';
import { STORE_TOKENS as T, tintAt } from '../../../theme/tokens';
import type { SectionProps } from './types';

/** A collection's products — the mock's "Best Selling Items" grid. */
export function CollectionSection({ section }: Readonly<SectionProps>) {
  const { t } = useStoreT();
  if (section.products.length === 0) return null;
  const title = section.title || section.collection?.name || t('ecommStore.home.bestSelling');
  const viewAll = section.collection ? paths.collection(section.collection.slug) : paths.shop;
  return (
    <Box component="section" aria-label={title}>
      <SectionHeading title={title} subtitle={section.subtitle} viewAll={viewAll} />
      <ProductGrid products={section.products.slice(0, 10)} />
    </Box>
  );
}

/** Operator banners, each a picture that links somewhere. */
export function PromoBannersSection({ section }: Readonly<SectionProps>) {
  if (section.items.length === 0) return null;
  return (
    <Box
      component="section"
      aria-label={section.title || undefined}
      sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: `repeat(${Math.min(section.items.length, 3)},1fr)` } }}
    >
      {section.items.map((item) => (
        <SmartLink key={item.id} to={item.link || paths.shop} underline="none" aria-label={item.title || item.cta_label}>
          <Box sx={{ borderRadius: `${T.radius.card}px`, overflow: 'hidden' }}>
            <StoreImage src={item.image_url} alt={item.title} width={640} height={280} />
          </Box>
        </SmartLink>
      ))}
    </Box>
  );
}

/** Why-buy-here points on pastel pills. */
export function UspStripSection({ section }: Readonly<SectionProps>) {
  if (section.items.length === 0) return null;
  return (
    <Box
      component="section"
      aria-label={section.title || undefined}
      sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr 1fr', md: `repeat(${Math.min(section.items.length, 4)},1fr)` } }}
    >
      {section.items.map((item, position) => (
        <Stack key={item.id} direction="row" spacing={1.5} sx={{ alignItems: 'center', bgcolor: tintAt(position), borderRadius: `${T.radius.card}px`, p: 1.5 }}>
          {item.image_url ? (
            <Box sx={{ width: 44, flexShrink: 0 }}>
              <StoreImage src={item.image_url} alt="" width={44} height={44} sx={{ objectFit: 'contain' }} />
            </Box>
          ) : null}
          <Stack>
            <Typography sx={{ fontWeight: 800 }}>{item.title}</Typography>
            {item.subtitle ? (
              <Typography variant="body2" color="text.secondary">
                {item.subtitle}
              </Typography>
            ) : null}
          </Stack>
        </Stack>
      ))}
    </Box>
  );
}

export function NewsletterSection({ section }: Readonly<SectionProps>) {
  const { t } = useStoreT();
  const title = section.title || t('ecommStore.footer.newsletter');
  return (
    <Stack component="section" aria-label={title} spacing={1.5} sx={{ bgcolor: T.brandTint, borderRadius: `${T.radius.card}px`, p: { xs: 2, md: 4 } }}>
      <Typography variant="h2" component="h2">
        {title}
      </Typography>
      <Typography color="text.secondary">{section.subtitle || t('ecommStore.newsletter.pitch')}</Typography>
      <Box sx={{ maxWidth: 480 }}>
        <NewsletterForm source="WEBSITE_PAGE" />
      </Box>
    </Stack>
  );
}

/** The slim "Free delivery above ₹X" row with its pill. Hidden when delivery is never free. */
export function FreeDeliveryBanner() {
  const { t } = useStoreT();
  const money = useMoney();
  const { free_shipping_above: above } = useStoreSettings();
  if (above <= 0) return null;
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', bgcolor: T.surface, borderRadius: `${T.radius.card}px`, p: 1.5, boxShadow: T.shadow }}>
      <Box sx={{ width: 44, height: 44, borderRadius: '14px', bgcolor: T.brandTint, display: 'grid', placeItems: 'center', flexShrink: 0 }} aria-hidden>
        <LocalShippingOutlinedIcon sx={{ color: T.brand }} />
      </Box>
      <Typography sx={{ flexGrow: 1, fontWeight: 700 }} variant="body2">
        {t('ecommStore.home.freeDelivery', { vars: { amount: money(above) } })}
      </Typography>
      <DuncitButton component={RouterLink} to={paths.shop} variant="contained" size="small">
        {t('ecommStore.home.shopNow')}
      </DuncitButton>
    </Stack>
  );
}
