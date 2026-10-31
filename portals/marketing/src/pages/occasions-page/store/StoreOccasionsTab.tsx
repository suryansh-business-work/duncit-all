import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, LinearProgress } from '@mui/material';
import { notify } from '@duncit/dialogs';
import { SectionCard } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { SAVE_STORE_OCCASIONS, STORE_OCCASIONS, type StoreOccasionsData } from './queries';
import { StoreOccasionsForm, type StoreOccasionsFormProps } from './store-occasions-form';

const REFRESH = ['MarketingStoreOccasions'];

/**
 * Occasions → Ecomm store: the festive windows of the pet store at
 * ecomm.duncit.com (moved here from the ecomm portal's Settings, so every
 * festive change is planned in one place). While a window is open the store
 * swaps its logo, favicon and background and wears its built-in look. It is a
 * separate product from the apps and from partner-brand shops — these windows
 * change only the store.
 */
export default function StoreOccasionsTab() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<StoreOccasionsData>(STORE_OCCASIONS, { fetchPolicy: 'cache-and-network' });
  const [saveMut] = useMutation(SAVE_STORE_OCCASIONS, { refetchQueries: REFRESH, awaitRefetchQueries: true });
  const occasions = data?.storeOccasions;

  const save: StoreOccasionsFormProps['onSubmit'] = async (input) => {
    try {
      await saveMut({ variables: { input } });
      notify(t('marketing.storeOccasions.saved'), 'success');
    } catch (err) {
      notify(parseApiError(err), 'error');
    }
  };

  return (
    <SectionCard title={t('marketing.storeOccasions.title')} subtitle={t('marketing.storeOccasions.subtitle')}>
      {loading && !occasions && <LinearProgress />}
      {error && <Alert severity="error">{parseApiError(error)}</Alert>}
      {occasions && (
        // A fresh form for each saved list, so it starts clean from what the server kept.
        <StoreOccasionsForm key={JSON.stringify(occasions)} occasions={occasions} onSubmit={save} />
      )}
    </SectionCard>
  );
}
