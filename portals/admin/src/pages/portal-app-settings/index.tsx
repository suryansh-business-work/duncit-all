import { useCallback, useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import { Alert, Box, Stack, Typography } from '@mui/material';
import AppsIcon from '@mui/icons-material/Apps';
import { useApolloTableFetch } from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import { notify } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import PortalAppSettingsTable from './PortalAppSettingsTable';
import {
  PORTAL_APP_TABLE,
  SET_PORTAL_APP_FEATURES,
  type PortalAppFeature,
  type PortalAppRow,
} from './queries';

/** Admin > System > Portal App Settings — which consoles offer the header's
 * "Chat with a coworker" and Apps buttons, one row per registered portal. */
export default function PortalAppSettingsPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [setFeatures] = useMutation(SET_PORTAL_APP_FEATURES);

  const fetchRows = useApolloTableFetch<PortalAppRow>(
    client,
    PORTAL_APP_TABLE,
    'portalModesTable'
  );

  const handleToggle = useCallback(
    async (row: PortalAppRow, feature: PortalAppFeature, next: boolean) => {
      setBusyKey(row.key);
      try {
        await setFeatures({ variables: { key: row.key, [feature]: next } });
        const messageKey =
          feature === 'chat_enabled' ? 'admin.portalApp.savedChat' : 'admin.portalApp.savedApps';
        const state = next ? t('admin.portalApp.on') : t('admin.portalApp.off');
        notify(t(messageKey, { vars: { state, portal: row.name } }), 'success');
        refetchRef.current?.();
      } catch (err) {
        notify(parseApiError(err), 'error');
      } finally {
        setBusyKey(null);
      }
    },
    [setFeatures, t]
  );

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" spacing={1} sx={{
        alignItems: "center"
      }}>
        <AppsIcon color="primary" />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5" sx={{
            fontWeight: 800
          }}>
            {t('admin.portalApp.title')}
          </Typography>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            {t('admin.portalApp.subtitle')}
          </Typography>
        </Box>
      </Stack>

      <Alert severity="info">{t('admin.portalApp.hint')}</Alert>

      <PortalAppSettingsTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        busyKey={busyKey}
        onToggle={handleToggle}
      />
    </Stack>
  );
}
