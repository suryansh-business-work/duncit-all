import { useQuery } from '@apollo/client/react';
import { Chip, List, ListItem, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { QueryGuard, SectionCard } from '@duncit/ui';
import ProductCardRow from '../../../components/ProductCardRow';
import RefreshButton from '../../../components/RefreshButton';
import { COLLECTION_PREVIEW } from '../../../queries/products';

/**
 * What the saved collection shows on the store right now — the store's own
 * search, so unlisted or out-of-shelf products are left out exactly as a
 * shopper would see.
 */
export default function CollectionPreview({ slug }: Readonly<{ slug: string }>) {
  const { t } = useTranslation();
  const title = t('ecommPortal.collections.preview');
  const { data, loading, error, refetch } = useQuery(COLLECTION_PREVIEW, {
    variables: { slug },
    skip: !slug,
    fetchPolicy: 'cache-and-network',
  });
  const cards = data?.storeAdminCollectionPreview ?? [];
  const action = slug ? <RefreshButton refetch={refetch} label={title} /> : undefined;
  return (
    <SectionCard title={title} subtitle={t('ecommPortal.collections.previewHint')} action={action}>
      {slug ? (
        <QueryGuard loading={loading && !data} error={error}>
          <Typography variant="caption" role="status" sx={{ color: 'text.secondary' }}>
            {t('ecommPortal.collections.productCount', { count: cards.length })}
          </Typography>
          <List dense disablePadding aria-label={title}>
            {cards.map((card) => (
              <ListItem key={card.id} divider disableGutters sx={{ display: 'block' }}>
                <ProductCardRow title={card.title} imageUrl={card.image_url} caption={card.brand_name} price={card.price}>
                  {!card.in_stock && <Chip size="small" label={t('ecommPortal.common.outOfStock')} />}
                </ProductCardRow>
              </ListItem>
            ))}
          </List>
        </QueryGuard>
      ) : (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('ecommPortal.collections.previewAfterSave')}
        </Typography>
      )}
    </SectionCard>
  );
}
