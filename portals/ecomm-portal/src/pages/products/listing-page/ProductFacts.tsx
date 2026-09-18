import { Alert, Divider, List, ListItem, ListItemText, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { ImagePreview, SectionCard } from '@duncit/ui';
import InfoRows from '../../../components/InfoRows';
import { money } from '../../../lib/format';
import type { StoreListing } from '../queries';

/**
 * The catalogue's facts about the product — set in the Products console, read
 * here so the listing can be written against them.
 */
export default function ProductFacts({ listing }: Readonly<{ listing: StoreListing }>) {
  const { t } = useTranslation();
  return (
    <SectionCard title={t('ecommPortal.listing.facts')} subtitle={t('ecommPortal.listing.factsHint')}>
      <Stack spacing={2}>
        {!listing.has_warehouse && <Alert severity="warning">{t('ecommPortal.listing.noWarehouse')}</Alert>}
        {listing.images.length > 0 && (
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
            {listing.images.map((src, index) => (
              <ImagePreview key={src} src={src} size={72} label={t('ecommPortal.listing.imageN', { vars: { n: index + 1 } })} />
            ))}
          </Stack>
        )}
        <InfoRows
          lines={[
            { key: 'name', label: t('ecommPortal.listing.catalogueName'), value: listing.product_name },
            { key: 'sku', label: t('ecommPortal.products.sku'), value: listing.sku },
            { key: 'brand', label: t('ecommPortal.products.brand'), value: listing.brand_name },
            { key: 'status', label: t('shell.common.status'), value: listing.status },
            { key: 'price', label: t('ecommPortal.products.price'), value: money(listing.price) },
            { key: 'available', label: t('ecommPortal.products.available'), value: String(listing.available) },
            { key: 'sold', label: t('ecommPortal.products.sold'), value: String(listing.sold_count) },
            { key: 'views', label: t('ecommPortal.products.views'), value: String(listing.view_count) },
            { key: 'wishlists', label: t('ecommPortal.products.wishlists'), value: String(listing.wishlist_count) },
          ]}
        />
        {listing.variants.length > 0 && (
          <>
            <Divider />
            <Typography component="h3" variant="subtitle2">
              {t('ecommPortal.listing.variants')}
            </Typography>
            <List dense disablePadding aria-label={t('ecommPortal.listing.variants')}>
              {listing.variants.map((variant) => (
                <ListItem key={variant.id} divider disableGutters>
                  <ListItemText
                    primary={variant.label || variant.sku}
                    secondary={t('ecommPortal.listing.variantFacts', {
                      vars: { sku: variant.sku, price: money(variant.price), stock: variant.available },
                    })}
                  />
                </ListItem>
              ))}
            </List>
          </>
        )}
        {listing.short_description && (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {listing.short_description}
          </Typography>
        )}
      </Stack>
    </SectionCard>
  );
}
