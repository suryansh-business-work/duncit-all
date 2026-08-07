import { Platform } from 'react-native';
import { GetImagekitAuthDocument } from '@/graphql/status';
import { graphqlRequest } from '@/services/graphql.client';

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

function postForm(
  url: string,
  form: FormData,
  onProgress?: (pct: number) => void,
): Promise<string> {
  // XMLHttpRequest instead of fetch so the upload reports REAL byte progress.
  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    // Clamped, and guarded against a zero total.
    //
    // A progress event is the transport's own accounting: React Native reports
    // `total` as the body size it knows about, which for a multipart body built
    // from a file URI can be smaller than what actually goes out — so the ratio
    // walks past 1 and the bar reads "137%". A percentage above 100 is never
    // meaningful, and a zero total divides to NaN.
    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable || e.total <= 0) return;
      onProgress?.(Math.min(100, Math.max(0, Math.round((e.loaded / e.total) * 100))));
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
 * Upload a picked file to ImageKit THROUGH our server.
 *
 * It used to go straight to ImageKit with a server-made signature. That only
 * works while the account's public and private keys are a matched pair, and a
 * mismatched pair rejects every upload with "invalid signature parameter" and
 * no other clue — so there is no signature here at all; the server holds the
 * private key and does the upload.
 *
 * Still multipart and still streamed from the URI, which is what keeps large
 * files off the GraphQL body limit and out of memory. `onProgress` receives the
 * REAL byte percentage while the upload runs.
 */
export async function uploadToImagekitDirect(
  file: DirectUploadFile,
  folder: string,
  onProgress?: (pct: number) => void,
): Promise<string> {
  // The pass is single use, so it is fetched per upload.
  const { getImagekitAuth: ticket } = await graphqlRequest(
    GetImagekitAuthDocument,
    { folder },
    { auth: true },
  );
  const form = new FormData();
  form.append('file', await toFilePart(file));
  const url =
    `${ticket.uploadUrl}?ticket=${encodeURIComponent(ticket.ticket)}` +
    `&fileName=${encodeURIComponent(file.name)}`;
  return postForm(url, form, onProgress);
}
