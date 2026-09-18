import { useMemo } from 'react';
import { Link as RouterLink, useParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Chip, Stack } from '@mui/material';
import { Loader } from '@duncit/ui';

import { STORE_CATEGORY } from '../../graphql/product';
import { paths } from '../../lib/paths';
import { firstFilled } from '../../lib/text';
import { usePageSeo } from '../../lib/usePageSeo';
import { useStoreT } from '../../i18n';
import { STORE_TOKENS as T } from '../../theme/tokens';
import { NotFoundContent } from '../info/NotFoundPage';
import { ShelfHeading } from './ShelfHeading';
import { ShelfView } from './ShelfView';

/** /c/:slug — an aisle, its breadcrumbs and its sub-aisles as chips. */
export function CategoryPage() {
  const { t } = useStoreT();
  const { slug = '' } = useParams();
  const { data, loading } = useQuery(STORE_CATEGORY, { variables: { slug } });
  const category = data?.storeCategory;
  usePageSeo(firstFilled(category?.seo_title, category?.name), firstFilled(category?.seo_description, category?.description));
  const scope = useMemo(() => ({ category: slug }), [slug]);
  if (loading && !category) return <Loader label={t('ecommStore.common.loading')} />;
  if (!category) return <NotFoundContent />;
  const crumbs = category.parent ? [{ label: category.parent.name, to: paths.category(category.parent.slug) }] : [];
  return (
    <ShelfView
      scope={scope}
      header={
        <ShelfHeading title={category.name} description={category.description} banner={category.banner_url} crumbs={crumbs}>
          {category.children.length > 0 ? (
            <Stack component="ul" direction="row" spacing={1} aria-label={t('ecommStore.shelf.subcategories')} sx={{ listStyle: 'none', p: 0, m: 0, overflowX: 'auto', pb: 0.5 }}>
              {category.children.map((child) => (
                <Stack component="li" key={child.id}>
                  <Chip label={child.name} component={RouterLink} to={paths.category(child.slug)} clickable sx={{ bgcolor: T.surface, border: 1, borderColor: T.border, minHeight: 40 }} />
                </Stack>
              ))}
            </Stack>
          ) : null}
        </ShelfHeading>
      }
    />
  );
}
