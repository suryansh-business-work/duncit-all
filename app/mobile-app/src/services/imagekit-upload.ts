import { Platform } from 'react-native';
import { GetImagekitAuthDocument } from '@/graphql/status';
import { graphqlRequest } from '@/services/graphql.client';

const IMAGEKIT_UPLOAD_URL = 'https://upload.imagekit.io/api/v1/files/upload';

export interface DirectUploadFile {
  uri: string;
  name: string;
  type: string;
}

async function toFilePart(file: DirectUploadFile): Promise<Blob> {
  if (Platform.OS === 'web') {
    // A DOM FormData stringifies the native {uri,name,type} part to
    // "[object Object]" and ImageKit rejects the request, so on web the picked
    // URI is materialised into a real File first.
    const blob = await fetch(file.uri).then((r) => r.blob());
    return new File([blob], file.name, { type: file.type });
  }
  // React Native multipart file part — the URI is streamed, not read into memory.
  return { uri: file.uri, name: file.name, type: file.type } as unknown as Blob;
}

function postForm(form: FormData, onProgress?: (pct: number) => void): Promise<string> {
  // XMLHttpRequest instead of fetch so the upload reports REAL byte progress.
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
        resolve(json?.url as string);
      } else {
        reject(new Error(json?.message || 'Upload failed'));
      }
    };
    xhr.onerror = () => reject(new Error('Upload failed'));
    xhr.send(form);
  });
}

/**
 * Upload a picked file DIRECTLY to ImageKit (multipart), bypassing the GraphQL
 * API's request-body size limit that blocked large support attachments. Fetches
 * short-lived signed auth from the server, then POSTs the file bytes straight to
 * ImageKit and returns the hosted URL. Nothing is base64-encoded through our API.
 * `onProgress` receives the REAL byte percentage while the upload runs.
 */
export async function uploadToImagekitDirect(
  file: DirectUploadFile,
  folder: string,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const { getImagekitAuth: auth } = await graphqlRequest(
    GetImagekitAuthDocument,
    {},
    { auth: true },
  );
  const form = new FormData();
  form.append('file', await toFilePart(file));
  form.append('fileName', file.name);
  form.append('useUniqueFileName', 'true');
  form.append('folder', folder);
  form.append('publicKey', auth.publicKey);
  form.append('signature', auth.signature);
  form.append('expire', String(auth.expire));
  form.append('token', auth.token);
  return postForm(form, onProgress);
}
