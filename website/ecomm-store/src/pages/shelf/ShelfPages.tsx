import { useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { useQuery } from '@apollo/client/react';

import { STORE_BRANDS } from '../../graphql/catalog';
import { usePageSeo } from '../../lib/usePageSeo';
import { useStoreT } from '../../i18n';
import { paths } from '../../lib/paths';
import { ShelfHeading } from './ShelfHeading';
import { ShelfView } from './ShelfView';

const NO_SCOPE = {};

/** /shop — everything on the shelf. */
export function ShopPage() {
  const { t } = useStoreT();
  usePageSeo(t('ecommStore.shelf.shopTitle'));
  return <ShelfView scope={NO_SCOPE} header={<ShelfHeading title={t('ecommStore.shelf.shopTitle')} />} />;
}

/** /search?q= — the same shelf, narrowed by what was typed. */
export function SearchPage() {
  const { t } = useStoreT();
  const [params] = useSearchParams();
  const q = params.get('q') ?? '';
  const title = q ? t('ecommStore.shelf.searchTitle', { vars: { q } }) : t('ecommStore.shelf.shopTitle');
  usePageSeo(title);
  return <ShelfView scope={NO_SCOPE} header={<ShelfHeading title={title} />} />;
}

/** /brand/:id — one brand's products. */
export function BrandPage() {
  const { t } = useStoreT();
  const { id = '' } = useParams();
  const { data } = useQuery(STORE_BRANDS);
  const brand = data?.storeBrands.find((b) => b.id === id);
  const name = brand?.name ?? '';
  usePageSeo(name, brand?.tagline);
  const scope = useMemo(() => ({ brand_ids: [id] }), [id]);
  return (
    <ShelfView
      scope={scope}
      header={
        <ShelfHeading
          title={name || t('ecommStore.shelf.brandFallback')}
          description={brand?.tagline}
          crumbs={[{ label: t('ecommStore.menu.brands'), to: paths.brands }]}
        />
      }
    />
  );
}
