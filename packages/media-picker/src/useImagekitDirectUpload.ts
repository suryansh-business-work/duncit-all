import { useCallback, useState } from 'react';
import { useApolloClient } from '@apollo/client';
import type { ApolloClient } from '@apollo/client';
import { GET_IMAGEKIT_AUTH } from './queries';
import type { UploadSurface } from './types';

interface UploadTicket {
  uploadUrl: string;
  ticket: string;
  urlEndpoint: string;
}

/**
 * The half of a pass that the POST actually needs. Anything the server hands
 * out — an ImageKit pass, a database-archive pass — satisfies it.
 */
export interface UploadPass {
  uploadUrl: string;
  ticket: string;
}

export type UploadProgress = (pct: number) => void;

/**
 * Send one file to OUR server on a single-use pass, and answer with whatever
 * JSON the route replies.
 *
 * It used to go straight to ImageKit with a signature the server generated.
 * That scheme only works while the account's public and private keys are a
 * matched pair, and a mismatched pair rejects every upload with "invalid
 * signature parameter" and no other clue. There is no signature here at all:
 * the server holds the private key and does the upload.
 *
 * Still XMLHttpRequest, because it is the only way to get real byte progress,
 * and still one round trip for the pass — which is single-use, so it is fetched
 * per upload rather than cached.
 */
export function uploadFileWithTicket(
  file: File,
  ticket: UploadPass,
  onProgress?: UploadProgress,
): Promise<Record<string, unknown>> {
  // A DOM FormData stringifies any non-Blob part to "[object Object]"; the raw
  // body has the same problem in a worse way, so fail fast with a clear message.
  if (!(file instanceof Blob)) {
    return Promise.reject(new Error('Cannot upload: a real file (Blob) is required.'));
  }
  const name = file.name || `upload-${Date.now()}`;
  const url =
    `${ticket.uploadUrl}?ticket=${encodeURIComponent(ticket.ticket)}` +
    `&fileName=${encodeURIComponent(name)}`;

  // Multipart, the same shape React Native streams a picked file in, so the
  // server has one path to read rather than two.
  const form = new FormData();
  form.append('file', file, name);

  return new Promise<Record<string, unknown>>((resolve, reject) => {
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
        // What "succeeded" looks like differs per store — a CDN url for
        // ImageKit, a file name for a database archive — so the caller reads
        // the field it asked for rather than this deciding for it.
        resolve(json ?? {});
      } else {
        reject(new Error(json?.message || 'Upload failed'));
      }
    };
    xhr.onerror = () => reject(new Error('Upload failed'));
    xhr.send(form);
  });
}

/**
 * Upload a file and get its CDN URL back.
 *
 * Named "direct" because it streams the bytes rather than base64-ing them
 * through a GraphQL mutation — which is what let large videos past the API
 * body limit, and still does.
 */
export async function directUploadToImagekit(
  client: ApolloClient<object>,
  file: File,
  folder: string,
  onProgress?: UploadProgress,
  // The raw POST carries only the ticket, so the surface has to be fixed on the
  // pass — it is what the AI Monitoring row is attributed to, and what decides
  // whether this surface's uploads are screened at all.
  surface: UploadSurface = 'PORTALS',
): Promise<string> {
  const { data } = await client.mutate({
    mutation: GET_IMAGEKIT_AUTH,
    variables: { folder, surface },
  });
  const ticket = (data as { getImagekitAuth?: UploadTicket } | null)?.getImagekitAuth;
  if (!ticket) throw new Error('Upload is not available right now');
  const uploaded = await uploadFileWithTicket(file, ticket, onProgress);
  if (typeof uploaded.url !== 'string') {
    throw new TypeError('Upload succeeded but no file URL came back');
  }
  return uploaded.url;
}

/**
 * Hook flavour of {@link directUploadToImagekit} with a busy flag, for
 * components that render a spinner while the upload runs.
 */
export function useImagekitDirectUpload() {
  const client = useApolloClient();
  const [uploading, setUploading] = useState(false);
  const upload = useCallback(
    async (
      file: File,
      folder: string,
      onProgress?: UploadProgress,
      surface: UploadSurface = 'PORTALS',
    ): Promise<string> => {
      setUploading(true);
      try {
        return await directUploadToImagekit(client, file, folder, onProgress, surface);
      } finally {
        setUploading(false);
      }
    },
    [client],
  );
  return { upload, uploading };
}
