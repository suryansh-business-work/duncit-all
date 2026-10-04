import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, CircularProgress, Dialog, DialogContent, DialogTitle, Stack } from '@mui/material';
import type { MutationRequestCatalogDeletionArgs, QueryCatalogDeletionPreviewArgs } from '@duncit/gql-types';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { fireAndForget, logs } from '@duncit/logs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import DeletionImpact from './DeletionImpact';
import DeletionRequestForm from './deletion-request.form';
import {
  deletionDefaults,
  toDeletionRequestVariables,
  type DeletionRequestValues,
  type DeletionTarget,
} from './deletion-request.types';
import {
  CATALOG_DELETION_PREVIEW,
  REQUEST_CATALOG_DELETION,
  type DeletionPreview,
  type DeletionRequestRow,
} from './deletion.queries';

interface Props {
  /** The approved brand or product to delete; null keeps the dialog closed. */
  target: DeletionTarget | null;
  onClose: () => void;
  /** The request was raised — refetch the rows. */
  onDone: () => void;
}

const TITLE_ID = 'deletion-request-title';

/** Deleting a LIVE brand or product: warn about what is still running, then raise a request for the Products team. */
export default function DeletionRequestDialog({ target, onClose, onDone }: Readonly<Props>) {
  const { t } = useTranslation();
  const [apiError, setApiError] = useState<string | null>(null);
  const preview = useQuery<{ catalogDeletionPreview: DeletionPreview }, QueryCatalogDeletionPreviewArgs>(CATALOG_DELETION_PREVIEW, {
    variables: { kind: target?.kind ?? 'PRODUCT', target_id: target?.id ?? '' },
    skip: !target,
    fetchPolicy: 'network-only',
  });
  const [requestDeletion, requestState] = useMutation<{ requestCatalogDeletion: DeletionRequestRow }, MutationRequestCatalogDeletionArgs>(
    REQUEST_CATALOG_DELETION,
  );
  const data = preview.data?.catalogDeletionPreview;

  const close = () => {
    setApiError(null);
    onClose();
  };

  const submit = async (values: DeletionRequestValues) => {
    if (!target) return;
    setApiError(null);
    try {
      await requestDeletion({ variables: toDeletionRequestVariables(target, values) });
      notifySuccess(t('partners.deletionRequest.submitted', { vars: { name: target.name } }));
      onDone();
      close();
    } catch (error) {
      const message = parseApiError(error);
      setApiError(message);
      notifyError(message);
    }
  };

  const renderBody = () => {
    if (preview.loading && !data) {
      return (
        <Stack sx={{ alignItems: 'center', py: 4 }}>
          <CircularProgress size={24} aria-label={t('shell.a11y.loading')} />
        </Stack>
      );
    }
    if (preview.error || !data) {
      return (
        <Stack spacing={1.5}>
          <Alert severity="error">{preview.error ? parseApiError(preview.error) : t('partners.deletionRequest.previewUnavailable')}</Alert>
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
            <DuncitButton onClick={close}>{t('shell.common.cancel')}</DuncitButton>
            <DuncitButton variant="contained" onClick={() => fireAndForget(preview.refetch(), logs.portal['partners-app'], 'DeletionRequestDialog', 'refetchPreview')}>
              {t('shell.common.retry')}
            </DuncitButton>
          </Stack>
        </Stack>
      );
    }
    return (
      <Stack spacing={2.5}>
        <DeletionImpact preview={data} />
        <DeletionRequestForm
          key={`${target?.kind}-${target?.id}`}
          earliest={data.window.earliest}
          latest={data.window.latest}
          defaultValues={deletionDefaults(data)}
          busy={requestState.loading}
          apiError={apiError}
          onSubmit={submit}
          onCancel={close}
        />
      </Stack>
    );
  };

  return (
    <Dialog open={Boolean(target)} onClose={requestState.loading ? undefined : close} fullWidth maxWidth="sm" aria-labelledby={TITLE_ID}>
      <DialogTitle id={TITLE_ID}>{t('partners.deletionRequest.title', { vars: { name: target?.name ?? '' } })}</DialogTitle>
      <DialogContent>{renderBody()}</DialogContent>
    </Dialog>
  );
}
