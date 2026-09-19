import { useParams, useSearchParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { QueryGuard } from '@duncit/ui';
import { useWebT } from '../../../shared/i18n';
import { EventListPage } from '../../components/events/EventListPage';
import { SearchForm } from '../../components/search-form';
import { LITE_CATEGORIES, LITE_CITY } from '../../graphql/discover';
import { usePageTitle } from '../../lib/usePageTitle';
import { NotFoundPage } from '../not-found';

/** /:citySlug — every upcoming event in one city. */
export function CityPage() {
  const { t } = useWebT();
  const { citySlug = '' } = useParams();
  const { data, loading, error } = useQuery(LITE_CITY, { variables: { slug: citySlug } });
  const city = data?.liteCity ?? null;
  usePageTitle(city ? t('liteWeb.city.title', { vars: { name: city.name } }) : '');
  if (!loading && !error && !city) return <NotFoundPage />;
  return (
    <QueryGuard loading={loading && !city} error={error} loadingLabel={t('lite.common.loading')}>
      {() =>
        city ? (
          <EventListPage
            title={t('liteWeb.city.title', { vars: { name: city.name } })}
            subtitle={t('liteWeb.city.subtitle', { count: city.events_count })}
            filter={{ city_slug: city.slug }}
            emptyTitle={t('liteWeb.city.empty', { vars: { name: city.name } })}
            emptyBody={t('liteWeb.events.emptyBody')}
            toolbar={<SearchForm citySlug={city.slug} />}
          />
        ) : null
      }
    </QueryGuard>
  );
}

/** /category/:slug — every upcoming event in one category. */
export function CategoryPage() {
  const { t } = useWebT();
  const { slug = '' } = useParams();
  const { data, loading, error } = useQuery(LITE_CATEGORIES);
  const category = data?.liteCategories.find((row) => row.slug === slug) ?? null;
  usePageTitle(category?.name ?? '');
  if (!loading && !error && !category) return <NotFoundPage />;
  return (
    <QueryGuard loading={loading && !category} error={error} loadingLabel={t('lite.common.loading')}>
      {() =>
        category ? (
          <EventListPage
            title={category.name}
            subtitle={t('liteWeb.category.subtitle', { count: category.events_count ?? 0 })}
            filter={{ category_slug: category.slug }}
            emptyTitle={t('liteWeb.category.empty', { vars: { name: category.name } })}
            emptyBody={t('liteWeb.events.emptyBody')}
          />
        ) : null
      }
    </QueryGuard>
  );
}

/** /search?q=&city= — events matching a search, optionally within one city. */
export function SearchPage() {
  const { t } = useWebT();
  const [params] = useSearchParams();
  const q = (params.get('q') ?? '').trim();
  const city = params.get('city');
  usePageTitle(t('liteWeb.search.title'));
  const title = q ? t('liteWeb.search.results', { vars: { q } }) : t('liteWeb.search.title');
  return (
    <EventListPage
      title={title}
      filter={{ search: q || null, city_slug: city }}
      emptyTitle={t('liteWeb.search.empty')}
      emptyBody={t('liteWeb.search.emptyBody')}
      toolbar={<SearchForm key={q} initial={q} citySlug={city} />}
    />
  );
}
