import { createContext, useContext, type ReactNode } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Container } from '@mui/material';
import { Loader } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import { LITE_SETTINGS, type LitePublicSettings } from '../../../shared/graphql/documents';
import { useWebT } from '../../../shared/i18n';

const SettingsContext = createContext<LitePublicSettings | null>(null);

/**
 * Loads the public settings once and holds every page until they arrive: the
 * site name, the Google client id and the support address decide how the
 * shell renders.
 */
export function LiteSettingsProvider({ children }: Readonly<{ children: ReactNode }>) {
  const { t } = useWebT();
  const { data, error } = useQuery<{ liteSettings: LitePublicSettings }>(LITE_SETTINGS, { fetchPolicy: 'cache-first' });
  const settings = data?.liteSettings;
  if (settings) return <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>;
  if (error) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Alert severity="error" role="alert" data-testid="settings-error">
          {parseApiError(error, t('lite.common.loadFailed'))}
        </Alert>
      </Container>
    );
  }
  return <Loader variant="page" label={t('lite.common.loading')} />;
}

export function useLiteSettings(): LitePublicSettings {
  const value = useContext(SettingsContext);
  if (!value) throw new Error('useLiteSettings needs a LiteSettingsProvider');
  return value;
}
