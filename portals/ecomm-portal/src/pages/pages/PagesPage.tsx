import { Link as RouterLink } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Alert, AlertTitle, Chip, Link } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import ListEditorPage from '../../components/ListEditorPage';
import RowMeta from '../../components/RowMeta';
import { useListEditor } from '../../components/useListEditor';
import { DELETE_PAGE, REORDER_PAGES, SAVE_PAGE, STORE_PAGES, type StorePage } from '../../queries/pages';
import PageForm from './page-form';

const DOCS = { save: SAVE_PAGE, remove: DELETE_PAGE, reorder: REORDER_PAGES, list: STORE_PAGES };

/** The four built-in policies live under Settings › Pages — this list is for everything else. */
function BuiltInNotice() {
  const { t } = useTranslation();
  return (
    <Alert severity="info" data-testid="pages-built-in">
      <AlertTitle>{t('ecommPortal.pages.builtIn')}</AlertTitle>
      {t('ecommPortal.pages.builtInHint')}{' '}
      <Link component={RouterLink} to="/settings?selectedtab=pages" data-testid="pages-built-in-link">
        {t('ecommPortal.nav.settings')}
      </Link>
    </Alert>
  );
}

/** The store's own pages — policies, guides, about — linked from the footer in this order. */
export default function PagesPage() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery(STORE_PAGES, { fetchPolicy: 'cache-and-network' });
  const editor = useListEditor<StorePage>(DOCS);
  return (
    <ListEditorPage<StorePage>
      title={t('ecommPortal.nav.pages')}
      subtitle={t('ecommPortal.pages.subtitle')}
      addLabel={t('ecommPortal.pages.add')}
      emptyText={t('ecommPortal.pages.empty')}
      items={data?.storeAdminPages ?? []}
      loading={loading}
      error={error}
      editor={editor}
      deleteMessage={t('ecommPortal.pages.deleteMessage')}
      intro={<BuiltInNotice />}
      getName={(page) => page.title}
      renderSecondary={(page) => (
        <RowMeta slug={page.slug} active={page.is_active}>
          {!page.show_in_footer && <Chip size="small" variant="outlined" label={t('ecommPortal.pages.notInFooter')} />}
        </RowMeta>
      )}
      renderForm={(props) => <PageForm {...props} />}
      testId="pages-page"
    />
  );
}
