import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Stack } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { notify } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { SET_WHATSAPP_DEFAULT_MEDIA, WHATSAPP_DEFAULT_MEDIA, type WaDefaultMedia } from '../wa-automation/queries';
import type { DefaultMediaKind, DefaultMediaValues } from './default-media-form';
import DefaultMediaSection from './DefaultMediaSection';

/**
 * The assets every media-header scenario sends when it has none of its own.
 *
 * 59 of the project's 74 templates carry an image or document header, and not
 * one campaign at AiSensy has an asset attached — so without these every one of
 * those scenarios came back `Media URL Missing`, and the only way out was to set
 * media on 52 rows by hand. This is that fix, once, and it is one asset PER
 * HEADER KIND because a picture cannot stand in for a file header.
 *
 * Both write the global row through one mutation; the per-row asset on the
 * Automation tab still wins where one is set.
 */
export default function DefaultMediaCard() {
  const { t } = useTranslation();
  const { data, loading, error, refetch } = useQuery<{ whatsappDefaultMedia: WaDefaultMedia }>(
    WHATSAPP_DEFAULT_MEDIA,
    { fetchPolicy: 'cache-and-network' }
  );
  const [setDefaultMedia] = useMutation<any>(SET_WHATSAPP_DEFAULT_MEDIA);
  const [busy, setBusy] = useState(false);
  const saved = data?.whatsappDefaultMedia;

  const save = async (kind: DefaultMediaKind, { url, filename }: DefaultMediaValues) => {
    setBusy(true);
    try {
      await setDefaultMedia({ variables: { kind, url, filename } });
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

  const loaded = !loading && !error && Boolean(saved);

  return (
    <Stack spacing={2}>
      {error && (
        <Alert severity="error">
          {parseApiError(error, t('marketingWhatsapp.defaultMedia.loadFailed'))}
        </Alert>
      )}

      <DefaultMediaSection
        kind="IMAGE"
        title={t('marketingWhatsapp.defaultMedia.title')}
        body={t('marketingWhatsapp.defaultMedia.body')}
        noneWarning={t('marketingWhatsapp.defaultMedia.none')}
        savedUrl={saved?.url ?? ''}
        savedFilename={saved?.filename ?? ''}
        busy={busy || loading}
        loaded={loaded}
        onSubmit={save}
      />

      <DefaultMediaSection
        kind="DOCUMENT"
        title={t('marketingWhatsapp.defaultMedia.documentTitle')}
        body={t('marketingWhatsapp.defaultMedia.documentBody')}
        noneWarning={t('marketingWhatsapp.defaultMedia.documentNone')}
        savedUrl={saved?.document_url ?? ''}
        savedFilename={saved?.document_filename ?? ''}
        busy={busy || loading}
        loaded={loaded}
        onSubmit={save}
      />
    </Stack>
  );
}
