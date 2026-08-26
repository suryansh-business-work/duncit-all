import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, Paper, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { notify } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { GLOBAL_EVENT_KEY } from '../wa-automation/helpers';
import {
  SET_WHATSAPP_SCENARIO_MEDIA,
  WHATSAPP_DEFAULT_MEDIA,
  type WaDefaultMedia,
} from '../wa-automation/queries';
import { DefaultMediaForm, type DefaultMediaValues } from './default-media-form';

/**
 * The image every media-header scenario sends when it has none of its own.
 *
 * 59 of the project's 74 templates carry an image or document header, and not
 * one campaign at AiSensy has an asset attached — so without this every one of
 * those scenarios came back `Media URL Missing`, and the only way out was to
 * set media on 52 rows by hand. This is that fix, once.
 *
 * It writes the SAME override pair the per-row dialog writes, onto the global
 * row — one mutation, one field pair, one place the send path reads. The
 * per-row asset still wins where one is set.
 */
export default function DefaultMediaCard() {
  const { t } = useTranslation();
  const { data, loading, error, refetch } = useQuery<{ whatsappDefaultMedia: WaDefaultMedia }>(
    WHATSAPP_DEFAULT_MEDIA,
    { fetchPolicy: 'cache-and-network' }
  );
  const [setMedia] = useMutation(SET_WHATSAPP_SCENARIO_MEDIA);
  const [busy, setBusy] = useState(false);
  const saved = data?.whatsappDefaultMedia.url ?? '';

  const save = async ({ url }: DefaultMediaValues) => {
    setBusy(true);
    try {
      await setMedia({ variables: { event_key: GLOBAL_EVENT_KEY, url, filename: '' } });
    } catch (e) {
      notify(parseApiError(e, t('marketingWhatsapp.defaultMedia.saveFailed')), 'error');
      setBusy(false);
      return;
    }
    notify(t('marketingWhatsapp.defaultMedia.saved'), 'success');
    // Outside the catch above: the write already stuck, and a re-read that
    // fails must not report the save as failed.
    await refetch().catch(() => undefined);
    setBusy(false);
  };

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
      <Stack spacing={2}>
        <Stack spacing={0.25}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            {t('marketingWhatsapp.defaultMedia.title')}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('marketingWhatsapp.defaultMedia.body')}
          </Typography>
        </Stack>

        {error && (
          <Alert severity="error">
            {parseApiError(error, t('marketingWhatsapp.defaultMedia.loadFailed'))}
          </Alert>
        )}
        {!loading && !error && !saved && (
          <Alert severity="warning">{t('marketingWhatsapp.defaultMedia.none')}</Alert>
        )}

        <DefaultMediaForm savedUrl={saved} busy={busy || loading} onSubmit={save} />
      </Stack>
    </Paper>
  );
}
