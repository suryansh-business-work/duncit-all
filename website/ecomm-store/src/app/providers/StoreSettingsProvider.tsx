import { createContext, useContext, type ReactNode } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Container } from '@mui/material';
import { Loader } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';

import { STORE_SETTINGS, type StoreSettings } from '../../graphql/settings';
import { useStoreT } from '../../i18n';

const SettingsContext = createContext<StoreSettings | null>(null);

/**
 * Loads the store's public settings once and holds every page until they
 * arrive: the currency, the store name and whether the store is open at all
 * decide how everything below renders.
 */
export function StoreSettingsProvider({ children }: Readonly<{ children: ReactNode }>) {
  const { t } = useStoreT();
  const { data, error } = useQuery(STORE_SETTINGS, {
    fetchPolicy: 'cache-first',
  });
  if (data?.storeSettings) {
    return <SettingsContext.Provider value={data.storeSettings}>{children}</SettingsContext.Provider>;
  }
  if (error) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Alert severity="error" role="alert">
          {parseApiError(error, t('ecommStore.common.loadFailed'))}
        </Alert>
      </Container>
    );
  }
  return <Loader variant="page" label={t('ecommStore.common.loading')} />;
}

export function useStoreSettings(): StoreSettings {
  const value = useContext(SettingsContext);
  if (!value) throw new Error('useStoreSettings needs a StoreSettingsProvider');
  return value;
}
