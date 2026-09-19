import { Link as RouterLink } from 'react-router';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import { DuncitButton } from '@duncit/buttons';
import { PageHeader } from '@duncit/ui';
import { useWebT } from '../../../shared/i18n';
import { EmptyState } from '../../components/EmptyState';
import { paths } from '../../lib/paths';
import { usePageTitle } from '../../lib/usePageTitle';

/** Anything the router cannot place, and any slug the API does not know. */
export function NotFoundPage() {
  const { t } = useWebT();
  usePageTitle(t('liteWeb.notFound.title'));
  return (
    <>
      <PageHeader title={t('liteWeb.notFound.title')} titleVariant="h4" />
      <EmptyState
        icon={<SearchOffIcon />}
        title={t('liteWeb.notFound.heading')}
        body={t('liteWeb.notFound.body')}
        testId="not-found"
        action={
          <DuncitButton component={RouterLink} to={paths.discover} variant="contained" data-testid="not-found-discover">
            {t('liteWeb.notFound.discover')}
          </DuncitButton>
        }
      />
    </>
  );
}
