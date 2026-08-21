import EcommRequestPage from './EcommRequestPage';
import { REQUEST_BRANDS } from './queries';
import { useTranslation } from '@duncit/shell';

/** Products portal → Ecomm Requests → Brand Request. Propose a brand edit that
 * is submitted for admin approval instead of applied directly (Task B item 2). */
export default function BrandRequestPage() {
  const { t } = useTranslation();
  return (
    <EcommRequestPage
      config={{
        kind: 'BRAND',
        title: t('products.requests.brandTitle'),
        subtitle: t('products.requests.brandSubtitle'),
        entitiesQuery: REQUEST_BRANDS,
        entitiesKey: 'marketplaceBrands',
        labelKey: 'brand_name',
        fields: [
          {
            name: 'brand_name',
            label: t('products.brandForm.brandName'),
            hint: 'The public brand name — reviewed before it changes.',
          },
          {
            name: 'tagline',
            label: t('products.brandForm.tagline'),
            hint: 'A short line shown under the brand name.',
          },
          {
            name: 'description',
            label: t('shell.common.description'),
            hint: 'About the brand.',
            multiline: true,
          },
          {
            name: 'website_url',
            label: t('products.brandForm.websiteUrl'),
            hint: 'The brand’s website link.',
          },
        ],
      }}
    />
  );
}
