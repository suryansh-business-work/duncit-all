import { Link as RouterLink } from 'react-router';
import PetsRoundedIcon from '@mui/icons-material/PetsRounded';
import { DuncitButton } from '@duncit/buttons';

import { EmptyState } from '../../components/EmptyState';
import { paths } from '../../lib/paths';
import { usePageSeo } from '../../lib/usePageSeo';
import { useStoreT } from '../../i18n';

/** The "nothing here" body — also shown by a shelf or product whose slug is unknown. */
export function NotFoundContent() {
  const { t } = useStoreT();
  usePageSeo(t('ecommStore.notFound.title'));
  return (
    <EmptyState
      icon={<PetsRoundedIcon />}
      title={t('ecommStore.notFound.title')}
      body={t('ecommStore.notFound.body')}
      action={
        <DuncitButton component={RouterLink} to={paths.home} variant="contained">
          {t('ecommStore.notFound.home')}
        </DuncitButton>
      }
    />
  );
}

export function NotFoundPage() {
  return <NotFoundContent />;
}
