import { useCallback, useState } from 'react';
import { useApolloClient } from '@apollo/client';
import type { ApolloClient } from '@apollo/client';
import { GET_IMAGEKIT_AUTH } from './queries';

const IMAGEKIT_UPLOAD_URL = 'https://upload.imagekit.io/api/v1/files/upload';

interface ImagekitAuth {
  token: string;
  expire: number;
  signature: string;
  publicKey: string;
  urlEndpoint: string;
}

export type UploadProgress = (pct: number) => void;

function postToImagekit(
  file: File,
  auth: ImagekitAuth,
  folder: string,
  onProgress?: UploadProgress,
): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  form.append('fileName', file.name || `upload-${Date.now()}`);
  form.append('useUniqueFileName', 'true');
  form.append('folder', folder);
  form.append('publicKey', auth.publicKey);
  form.append('signature', auth.signature);
  form.append('expire', String(auth.expire));
  form.append('token', auth.token);
  // XMLHttpRequest instead of fetch so the upload can report REAL byte progress.
  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', IMAGEKIT_UPLOAD_URL);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let json: any = {};
      try {
        json = JSON.parse(xhr.responseText);
      } catch {
        // Non-JSON body — fall through to the generic error below.
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(json.url as string);
      } else {
        reject(new Error(json?.message || 'Upload failed'));
      }
    };
    xhr.onerror = () => reject(new Error('Upload failed'));
    xhr.send(form);
  });
}

/**
 * Direct-to-ImageKit upload (large files, e.g. pod reels & support videos).
 * Fetches short-lived signed auth from the server, then streams the file
 * straight to ImageKit — bypassing the API request-body size limit and the
 * 50 MB server-side video cap on the base64-mutation path. Reports real byte
 * progress via `onProgress`.
 */
export async function directUploadToImagekit(
  client: ApolloClient<object>,
  file: File,
  folder: string,
  onProgress?: UploadProgress,
): Promise<string> {
  const { data } = await client.mutate({ mutation: GET_IMAGEKIT_AUTH });
  const auth = (data as { getImagekitAuth?: ImagekitAuth } | null)?.getImagekitAuth;
  if (!auth) throw new Error('Upload is not available right now');
  return postToImagekit(file, auth, folder, onProgress);
}

/**
 * Hook flavour of {@link directUploadToImagekit} with a busy flag, for
 * components that render a spinner while the upload runs.
 */
export function useImagekitDirectUpload() {
  const client = useApolloClient();
  const [uploading, setUploading] = useState(false);
  const upload = useCallback(
    async (file: File, folder: string, onProgress?: UploadProgress): Promise<string> => {
      setUploading(true);
      try {
        return await directUploadToImagekit(client, file, folder, onProgress);
      } finally {
        setUploading(false);
      }
    },
    [client],
  );
  return { upload, uploading };
}
