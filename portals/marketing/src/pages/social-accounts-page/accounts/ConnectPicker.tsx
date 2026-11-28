import { useId } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useSearchParams } from 'react-router';
import { Alert, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { notify } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { PROVIDER_LABEL } from '../copy';
import { ConnectPickerForm } from '../connect-picker-form';
import { COMPLETE_SOCIAL_CONNECTION, SOCIAL_PENDING_CONNECTION, type SocialPendingConnection, type SocialProvider } from '../queries';
import NothingFound from './NothingFound';

/** The query-string key the OAuth callback puts the held grant's id under. */
export const PICK_PARAM = 'pick';

/**
 * After a connect, the server sends the marketer back with `?pick=<id>`: what
 * the grant reached, held until they choose. This opens it as a dialog to
 * tick, creates only the ticked accounts, and takes the id out of the URL
 * whichever way the dialog closes, so a reload does not open it again.
 */
export default function ConnectPicker({ onDone }: Readonly<{ onDone: () => void }>) {
  const { t } = useTranslation();
  const titleId = useId();
  const [params, setParams] = useSearchParams();
  const id = params.get(PICK_PARAM) ?? '';
  const { data, loading, error } = useQuery<{ socialPendingConnection: SocialPendingConnection }>(SOCIAL_PENDING_CONNECTION, {
    variables: { id },
    skip: !id,
    fetchPolicy: 'network-only',
  });
  const [complete] = useMutation<{ completeSocialConnection: { provider: SocialProvider; count: number } }>(COMPLETE_SOCIAL_CONNECTION);
  const connection = data?.socialPendingConnection;

  const close = () =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete(PICK_PARAM);
        return next;
      },
      { replace: true }
    );

  const submit = async (keys: string[]) => {
    try {
      const result = (await complete({ variables: { id, account_keys: keys } })).data?.completeSocialConnection;
      if (result) notify(t('marketing.social.connectedToast', { count: result.count, vars: { provider: t(PROVIDER_LABEL[result.provider]) } }), 'success');
      onDone();
      close();
    } catch (err) {
      notify(parseApiError(err), 'error');
    }
  };

  if (!id) return null;
  return (
    <Dialog open onClose={close} fullWidth maxWidth="sm" aria-labelledby={titleId} data-testid="connect-picker">
      <DialogTitle id={titleId}>{t('marketing.socialPicker.title')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          {loading && !connection && <LinearProgress aria-label={t('marketing.socialPicker.loading')} />}
          {error && <Alert severity="error">{parseApiError(error)}</Alert>}
          {connection && connection.found === 0 && <NothingFound connection={connection} />}
          {connection && connection.found > 0 && (
            <>
              <Typography variant="body2" sx={{ color: 'text.secondary' }} data-testid="connect-picker-intro">
                {t('marketing.socialPicker.intro', { vars: { provider: t(PROVIDER_LABEL[connection.provider]) } })}
              </Typography>
              <ConnectPickerForm connection={connection} onSubmit={submit} onCancel={close} />
            </>
          )}
        </Stack>
      </DialogContent>
      {(!connection || connection.found === 0) && (
        <DialogActions>
          <DuncitButton onClick={close} data-testid="connect-picker-close">
            {t('marketing.socialPicker.close')}
          </DuncitButton>
        </DialogActions>
      )}
    </Dialog>
  );
}
