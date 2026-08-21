import EcommRequestPage from './EcommRequestPage';
import { REQUEST_PRODUCTS } from './queries';
import { useTranslation } from '@duncit/shell';

/** Products portal → Ecomm Requests → Product Request. Propose a product edit
 * that is submitted for admin approval instead of applied directly (Task B item 2). */
export default function ProductRequestPage() {
  const { t } = useTranslation();
  return (
    <EcommRequestPage
      config={{
        kind: 'PRODUCT',
        title: t('products.requests.productTitle'),
        subtitle: t('products.requests.productSubtitle'),
        entitiesQuery: REQUEST_PRODUCTS,
        entitiesKey: 'inventoryProducts',
        labelKey: 'product_name',
        fields: [
          {
            name: 'product_name',
            label: t('products.requests.productName'),
            hint: 'The catalogue name — reviewed before it changes.',
          },
          {
            name: 'short_description',
            label: t('products.requests.shortDescription'),
            hint: 'A one-line summary shown in listings.',
          },
          {
            name: 'description',
            label: t('shell.common.description'),
            hint: 'Full product details.',
            multiline: true,
          },
          {
            name: 'selling_price',
            label: t('products.requests.sellingPrice'),
            hint: 'Proposed price; reviewed before it changes.',
            numeric: true,
          },
        ],
      }}
    />
  );
}
