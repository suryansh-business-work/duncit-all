import { useState } from 'react';
import { type ApolloCache } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import {
  DATA_CLONE_SETTINGS,
  SAVE_DATA_CLONE_CONNECTION,
  TEST_DATA_CLONE_CONNECTION,
  type CloneSettings,
  type DataCloneRole,
} from '../queries';
import ConnectionAccordion from './ConnectionAccordion';
import type { DataCloneConnectionValues } from './data-clone-connection.types';

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Both mutations return the WHOLE settings object so the cache can be replaced
 * outright — one shape in, one shape out, and no refetch round trip after a
 * connect that already took several seconds.
 */
const writeSettings = (cache: ApolloCache<unknown>, settings?: CloneSettings) => {
  if (!settings) return;
  cache.writeQuery({ query: DATA_CLONE_SETTINGS, data: { dataCloneSettings: settings } });
};

/** Where the production and staging databases a clone runs between are connected. */
export default function DataCloneSettingsDialog({ open, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  // A set, not one role: the two accordions submit independently, and a single
  // slot let the second request clear the first one's busy flag while it was
  // still in flight — re-enabling a button whose ten-second probe had not
  // returned, so the same connect could be fired twice.
  const [pending, setPending] = useState<readonly DataCloneRole[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, loading, error } = useQuery<{ dataCloneSettings: CloneSettings }>(
    DATA_CLONE_SETTINGS,
    { fetchPolicy: 'cache-and-network' },
  );
  const [save] = useMutation<{ saveDataCloneConnection: CloneSettings }>(
    SAVE_DATA_CLONE_CONNECTION,
    { update: (cache, result) => writeSettings(cache, result.data?.saveDataCloneConnection) },
  );
  const [test] = useMutation<{ testDataCloneConnection: CloneSettings }>(
    TEST_DATA_CLONE_CONNECTION,
    { update: (cache, result) => writeSettings(cache, result.data?.testDataCloneConnection) },
  );

  const run = async (role: DataCloneRole, action: () => Promise<unknown>) => {
    setActionError(null);
    setPending((roles) => [...roles, role]);
    try {
      await action();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : t('tech.dataClone.connectFailed'));
    } finally {
      setPending((roles) => roles.filter((r) => r !== role));
    }
  };

  const handleSubmit = (role: DataCloneRole) => (values: DataCloneConnectionValues) =>
    run(role, () => save({ variables: { role, input: values } }));

  const handleTest = (role: DataCloneRole) => () =>
    run(role, () => test({ variables: { role } }));

  const settings = data?.dataCloneSettings;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('tech.dataClone.settingsTitle')}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            {t('tech.dataClone.settingsHint')}
          </Typography>

          {loading && !settings && <LinearProgress />}
          {error && <Alert severity="error">{error.message}</Alert>}
          {actionError && (
            <Alert severity="error" onClose={() => setActionError(null)}>
              {actionError}
            </Alert>
          )}

          {settings && (
            <Stack>
              <ConnectionAccordion
                label={t('tech.dataClone.roleProduction')}
                connection={settings.production}
                busy={pending.includes('PRODUCTION')}
                onSubmit={handleSubmit('PRODUCTION')}
                onTest={handleTest('PRODUCTION')}
              />
              <ConnectionAccordion
                label={t('tech.dataClone.roleStaging')}
                connection={settings.staging}
                busy={pending.includes('STAGING')}
                onSubmit={handleSubmit('STAGING')}
                onTest={handleTest('STAGING')}
              />
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose} disabled={pending.length > 0}>
          {t('tech.dataClone.close')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
