import { useMemo } from 'react';
import { useParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Loader } from '@duncit/ui';

import { STORE_COLLECTION } from '../../graphql/product';
import { firstFilled } from '../../lib/text';
import { usePageSeo } from '../../lib/usePageSeo';
import { useStoreT } from '../../i18n';
import { NotFoundContent } from '../info/NotFoundPage';
import { ShelfHeading } from './ShelfHeading';
import { ShelfView } from './ShelfView';

/** /collections/:slug — a curated set, with its banner. */
export function CollectionPage() {
  const { t } = useStoreT();
  const { slug = '' } = useParams();
  const { data, loading } = useQuery(STORE_COLLECTION, { variables: { slug } });
  const collection = data?.storeCollection;
  usePageSeo(firstFilled(collection?.seo_title, collection?.name), firstFilled(collection?.seo_description, collection?.description));
  const scope = useMemo(() => ({ collection: slug }), [slug]);
  if (loading && !collection) return <Loader label={t('ecommStore.common.loading')} />;
  if (!collection) return <NotFoundContent />;
  return (
    <ShelfView
      scope={scope}
      header={<ShelfHeading title={collection.name} description={collection.description} banner={collection.banner_url} />}
    />
  );
}
