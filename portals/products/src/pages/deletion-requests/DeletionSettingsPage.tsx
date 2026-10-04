import { useMemo } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { logs } from '@duncit/logs';
import { useTranslation } from '@duncit/shell';
import {
  DeletionSettingsForm,
  toDeletionSettingsForm,
  toDeletionSettingsInput,
  type CatalogDeletionWindow,
  type DeletionSettingsFormValues,
} from './deletion-settings-form';
import { CATALOG_DELETION_WINDOW, UPDATE_CATALOG_DELETION_WINDOW } from './queries';

/** Products › Delete Requests › Deletion Settings — the min/max days a partner's deletion date must fall in. */
export default function DeletionSettingsPage() {
  const { t } = useTranslation();
  const { data, loading, refetch } = useQuery<{ catalogDeletionWindow: CatalogDeletionWindow }>(CATALOG_DELETION_WINDOW, {
    fetchPolicy: 'cache-and-network',
  });
  const [save, { loading: saving }] = useMutation(UPDATE_CATALOG_DELETION_WINDOW, {
    refetchQueries: [{ query: CATALOG_DELETION_WINDOW }],
  });
  const current = data?.catalogDeletionWindow;
  const initialValues = useMemo(() => (current ? toDeletionSettingsForm(current) : null), [current]);

  const onSubmit = async (values: DeletionSettingsFormValues) => {
    try {
      await save({ variables: { input: toDeletionSettingsInput(values) } });
      notifySuccess(t('products.deletionSettings.saved'));
    } catch (error) {
      logs.portal.products.error('DeletionSettingsPage', 'save', { error });
      notifyError(error instanceof Error ? error.message : t('products.deletionSettings.saveFailed'));
    }
  };

  let body;
  if (initialValues) {
    body = <DeletionSettingsForm initialValues={initialValues} saving={saving} onSubmit={onSubmit} />;
  } else if (loading) {
    body = (
      <Stack sx={{ alignItems: 'center', p: 4 }}>
        <CircularProgress aria-label={t('products.deletionSettings.title')} />
      </Stack>
    );
  } else {
    body = (
      <Alert
        severity="error"
        action={
          <DuncitButton color="inherit" size="small" onClick={() => refetch().catch(() => undefined)}>
            {t('shell.common.retry')}
          </DuncitButton>
        }
      >
        {t('products.deletionSettings.loadFailed')}
      </Alert>
    );
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography component="h1" variant="h4" sx={{ fontWeight: 700 }}>
          {t('products.deletionSettings.title')}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('products.deletionSettings.description')}
        </Typography>
      </Box>
      {current && (
        <Alert severity="info">
          {t('products.deletionSettings.today', { vars: { earliest: current.earliest, latest: current.latest } })}
        </Alert>
      )}
      {body}
    </Stack>
  );
}
