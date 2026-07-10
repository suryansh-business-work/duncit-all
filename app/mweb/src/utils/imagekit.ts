import { useCallback, useState } from 'react';
import { gql, useMutation } from '@apollo/client';

/** Short-lived signed auth so the browser can upload a file DIRECTLY to ImageKit,
 * bypassing the API request-body size limit. The private key never leaves the server. */
export const GET_IMAGEKIT_AUTH = gql`
  mutation GetImagekitAuth {
    getImagekitAuth {
      token
      expire
      signature
      publicKey
      urlEndpoint
    }
  }
`;

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
  const res = await fetch(IMAGEKIT_UPLOAD_URL, { method: 'POST', body: form });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message || 'Upload failed');
  }
  return json.url as string;
}

/**
 * Direct-to-ImageKit upload hook for support attachments. Fetches short-lived
 * signed auth from the server, then uploads the file straight to ImageKit —
 * bypassing the API request-body size limit that blocked large attachments.
 */
export function useImagekitUpload() {
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
