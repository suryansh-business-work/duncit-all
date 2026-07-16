import { useCallback, useState } from 'react';
import { useMutation } from '@apollo/client';
import { GET_IMAGEKIT_AUTH } from './queries';

const IMAGEKIT_UPLOAD_URL = 'https://upload.imagekit.io/api/v1/files/upload';

interface ImagekitAuth {
  token: string;
  expire: number;
  signature: string;
  publicKey: string;
  urlEndpoint: string;
}

async function postToImagekit(file: File, auth: ImagekitAuth, folder: string): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  form.append('fileName', file.name || `upload-${Date.now()}`);
  form.append('useUniqueFileName', 'true');
  form.append('folder', folder);
  form.append('publicKey', auth.publicKey);
  form.append('signature', auth.signature);
  form.append('expire', String(auth.expire));
  form.append('token', auth.token);
  const res = await globalThis.fetch(IMAGEKIT_UPLOAD_URL, { method: 'POST', body: form });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message || 'Upload failed');
  }
  return json.url as string;
}

/**
 * Direct-to-ImageKit upload hook (large files, e.g. support videos). Fetches
 * short-lived signed auth from the server, then uploads the file straight to
 * ImageKit — bypassing the API request-body size limit that blocks large
 * attachments on the base64-mutation path. Ported verbatim from
 * app/mweb/src/utils/imagekit.ts (useImagekitUpload).
 */
export function useImagekitDirectUpload() {
  const [getAuth] = useMutation(GET_IMAGEKIT_AUTH);
  const [uploading, setUploading] = useState(false);
  const upload = useCallback(
    async (file: File, folder: string): Promise<string> => {
      setUploading(true);
      try {
        const { data } = await getAuth();
        const auth = data?.getImagekitAuth as ImagekitAuth | undefined;
        if (!auth) throw new Error('Upload is not available right now');
        return await postToImagekit(file, auth, folder);
      } finally {
        setUploading(false);
      }
    },
    [getAuth],
  );
  return { upload, uploading };
}
