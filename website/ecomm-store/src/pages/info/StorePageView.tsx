import { useQuery } from '@apollo/client/react';
import { Alert, Paper, Stack, Typography } from '@mui/material';
import { Loader } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';

import { RichHtml } from '../../components/RichHtml';
import { STORE_PAGE } from '../../graphql/settings';
import { firstFilled } from '../../lib/text';
import { usePageSeo } from '../../lib/usePageSeo';
import { useStoreT } from '../../i18n';
import { NotFoundContent } from './NotFoundPage';

/** A page's operator-written HTML on a card, or the "being written" note when it is blank. */
export function PageBody({ html }: Readonly<{ html: string }>) {
  const { t } = useStoreT();
  return (
    <Paper sx={{ p: { xs: 2, md: 4 } }}>
      {html.trim() ? <RichHtml html={html} /> : <Typography color="text.secondary">{t('ecommStore.pages.empty')}</Typography>}
    </Paper>
  );
}

/** One of the store's own pages, by slug — the not-found body when there is no such page. */
export function StorePageView({ slug }: Readonly<{ slug: string }>) {
  const { t } = useStoreT();
  const { data, loading, error } = useQuery(STORE_PAGE, { variables: { slug } });
  const page = data?.storePage;
  usePageSeo(firstFilled(page?.seo_title, page?.title), page?.seo_description);
  if (loading && !page) return <Loader label={t('ecommStore.common.loading')} />;
  if (error) return <Alert severity="error">{parseApiError(error, t('ecommStore.common.loadFailed'))}</Alert>;
  if (!page) return <NotFoundContent />;
  return (
    <Stack spacing={2} sx={{ maxWidth: 820, mx: 'auto' }} data-testid="store-page">
      <Typography variant="h1">{page.title}</Typography>
      <PageBody html={page.content_html} />
    </Stack>
  );
}
