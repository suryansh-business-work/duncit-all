import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { notifyError } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useCommonT } from '../i18n';
import { LITE_IMPORT_PEXELS_PHOTO } from './picture.graphql';
import { ACCEPTED_TYPES, BYTES_PER_MB } from './picture.types';
import { uploadPicture } from './upload';

/** The busy marker while a device upload is in flight (tile ids are Pexels ids or URLs, never this). */
export const UPLOADING = '__upload__';

interface Options {
  tokenKey: string;
  maxMb: number;
  onPicked: (url: string) => void;
}

/**
 * The two ways a picture arrives: a file from the device (checked here first,
 * then sent to the upload route) or a Pexels photo copied to ImageKit by id.
 * One thing at a time: `busyId` names it, and a failure is said in a toast.
 */
export function usePictureActions({ tokenKey, maxMb, onPicked }: Options) {
  const { t } = useCommonT();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [importPhoto] = useMutation<{ liteImportPexelsPhoto: { url: string } }, { id: string }>(LITE_IMPORT_PEXELS_PHOTO);

  const upload = (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      notifyError(t('lite.picture.notAnImage'));
      return;
    }
    if (file.size > maxMb * BYTES_PER_MB) {
      notifyError(t('lite.picture.tooLarge', { vars: { max: maxMb } }));
      return;
    }
    setBusyId(UPLOADING);
    uploadPicture(file, tokenKey)
      .then(onPicked)
      .catch((error: unknown) => notifyError(parseApiError(error, t('lite.picture.uploadFailed'))))
      .finally(() => setBusyId(null));
  };

  const importStock = (id: string) => {
    setBusyId(id);
    importPhoto({ variables: { id } })
      .then(({ data }) => {
        if (data) onPicked(data.liteImportPexelsPhoto.url);
      })
      .catch((error: unknown) => notifyError(parseApiError(error, t('lite.picture.importFailed'))))
      .finally(() => setBusyId(null));
  };

  return { busyId, upload, importStock };
}
