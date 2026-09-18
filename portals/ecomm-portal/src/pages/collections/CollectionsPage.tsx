import { useNavigate } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Chip, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import ListEditorPage from '../../components/ListEditorPage';
import ProductThumb from '../../components/ProductThumb';
import RowMeta from '../../components/RowMeta';
import { useListEditor } from '../../components/useListEditor';
import {
  DELETE_COLLECTION,
  REORDER_COLLECTIONS,
  SAVE_COLLECTION,
  STORE_COLLECTIONS,
  type StoreCollection,
} from './queries';
import { MODE_KEYS } from './modes';

const DOCS = { save: SAVE_COLLECTION, remove: DELETE_COLLECTION, reorder: REORDER_COLLECTIONS, list: STORE_COLLECTIONS };

/** Curated shelves — hand-picked or rule-built — in the order the store lists them. */
export default function CollectionsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, loading, error } = useQuery(STORE_COLLECTIONS, { fetchPolicy: 'cache-and-network' });
  const editor = useListEditor<StoreCollection>(DOCS);
  return (
    <ListEditorPage<StoreCollection>
      title={t('ecommPortal.nav.collections')}
      subtitle={t('ecommPortal.collections.subtitle')}
      addLabel={t('ecommPortal.collections.add')}
      emptyText={t('ecommPortal.collections.empty')}
      items={data?.storeAdminCollections ?? []}
      loading={loading}
      error={error}
      editor={editor}
      deleteMessage={t('ecommPortal.collections.deleteMessage')}
      getName={(collection) => collection.name}
      renderLeading={(collection) => <ProductThumb src={collection.image_url} />}
      renderSecondary={(collection) => (
        <RowMeta slug={collection.slug} active={collection.is_active}>
          <Chip size="small" variant="outlined" label={t(MODE_KEYS[collection.mode])} />
          {collection.mode === 'MANUAL' && (
            <Typography variant="caption" component="span" sx={{ color: 'text.secondary' }}>
              {t('ecommPortal.collections.productCount', { count: collection.product_ids.length })}
            </Typography>
          )}
        </RowMeta>
      )}
      onAdd={() => navigate('/collections/new')}
      onEdit={(collection) => navigate(`/collections/${collection.id}`)}
    />
  );
}
