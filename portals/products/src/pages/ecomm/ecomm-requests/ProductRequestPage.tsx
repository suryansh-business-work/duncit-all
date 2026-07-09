import EcommRequestPage from './EcommRequestPage';
import { REQUEST_PRODUCTS } from './queries';

/** Products portal → Ecomm Requests → Product Request. Propose a product edit
 * that is submitted for admin approval instead of applied directly (Task B item 2). */
export default function ProductRequestPage() {
  return (
    <EcommRequestPage
      config={{
        kind: 'PRODUCT',
        title: 'Product Request',
        subtitle:
          'Propose changes to a product listing. Your edits are submitted for admin approval before they go live.',
        entitiesQuery: REQUEST_PRODUCTS,
        entitiesKey: 'inventoryProducts',
        labelKey: 'product_name',
        fields: [
          {
            name: 'product_name',
            label: 'Product name',
            hint: 'The catalogue name — reviewed before it changes.',
          },
          {
            name: 'short_description',
            label: 'Short description',
            hint: 'A one-line summary shown in listings.',
          },
          {
            name: 'description',
            label: 'Description',
            hint: 'Full product details.',
            multiline: true,
          },
          {
            name: 'selling_price',
            label: 'Selling price (₹)',
            hint: 'Proposed price; reviewed before it changes.',
            numeric: true,
          },
        ],
      }}
    />
  );
}
