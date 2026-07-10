import { GetImagekitAuthDocument } from '@/graphql/status';
import { graphqlRequest } from '@/services/graphql.client';

const IMAGEKIT_UPLOAD_URL = 'https://upload.imagekit.io/api/v1/files/upload';

export interface DirectUploadFile {
  uri: string;
  name: string;
  type: string;
}

/**
 * Upload a picked file DIRECTLY to ImageKit (multipart), bypassing the GraphQL
 * API's request-body size limit that blocked large support attachments. Fetches
 * short-lived signed auth from the server, then POSTs the file bytes straight to
 * ImageKit and returns the hosted URL. Nothing is base64-encoded through our API.
 */
export async function uploadToImagekitDirect(
  file: DirectUploadFile,
  folder: string,
): Promise<string> {
  const { getImagekitAuth: auth } = await graphqlRequest(
    GetImagekitAuthDocument,
    {},
    { auth: true },
  );
  const form = new FormData();
  // React Native multipart file part — the URI is streamed, not read into memory.
  form.append('file', { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
  form.append('fileName', file.name);
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
