import EcommRequestPage from './EcommRequestPage';
import { REQUEST_BRANDS } from './queries';

/** Products portal → Ecomm Requests → Brand Request. Propose a brand edit that
 * is submitted for admin approval instead of applied directly (Task B item 2). */
export default function BrandRequestPage() {
  return (
    <EcommRequestPage
      config={{
        kind: 'BRAND',
        title: 'Brand Request',
        subtitle:
          'Propose changes to a brand profile. Your edits are submitted for admin approval before they go live.',
        entitiesQuery: REQUEST_BRANDS,
        entitiesKey: 'marketplaceBrands',
        labelKey: 'brand_name',
        fields: [
          {
            name: 'brand_name',
            label: 'Brand name',
            hint: 'The public brand name — reviewed before it changes.',
          },
          {
            name: 'tagline',
            label: 'Tagline',
            hint: 'A short line shown under the brand name.',
          },
          {
            name: 'description',
            label: 'Description',
            hint: 'About the brand.',
            multiline: true,
          },
          {
            name: 'website_url',
            label: 'Website URL',
            hint: 'The brand’s website link.',
          },
        ],
      }}
    />
  );
}
