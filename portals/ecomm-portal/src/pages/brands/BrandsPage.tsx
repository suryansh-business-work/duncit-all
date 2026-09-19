import { useQuery } from '@apollo/client/react';
import { useTranslation } from '@duncit/shell';
import ListEditorPage from '../../components/ListEditorPage';
import ProductThumb from '../../components/ProductThumb';
import RowMeta from '../../components/RowMeta';
import { useListEditor } from '../../components/useListEditor';
import { DELETE_BRAND, REORDER_BRANDS, SAVE_BRAND, STORE_BRANDS, type StoreBrand } from '../../queries/taxonomy';
import BrandForm from './brand-form';

const DOCS = { save: SAVE_BRAND, remove: DELETE_BRAND, reorder: REORDER_BRANDS, list: STORE_BRANDS };

/** The store's own brands, in the order the store shows them. */
export default function BrandsPage() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery(STORE_BRANDS, { fetchPolicy: 'cache-and-network' });
  const editor = useListEditor<StoreBrand>(DOCS);
  return (
    <ListEditorPage<StoreBrand>
      title={t('ecommPortal.nav.brands')}
      subtitle={t('ecommPortal.brands.subtitle')}
      addLabel={t('ecommPortal.brands.add')}
      emptyText={t('ecommPortal.brands.empty')}
      items={data?.storeAdminBrands ?? []}
      loading={loading}
      error={error}
      editor={editor}
      deleteMessage={t('ecommPortal.brands.deleteMessage')}
      getName={(brand) => brand.name}
      renderLeading={(brand) => <ProductThumb src={brand.logo_url} />}
      renderSecondary={(brand) => <RowMeta slug={brand.slug} active={brand.is_active} />}
      renderForm={(props) => <BrandForm {...props} />}
      testId="brands-page"
    />
  );
}
