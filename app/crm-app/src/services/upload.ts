import { CrmAppUploadTicketDocument } from '@/graphql/comms';
import { gqlRequest } from '@/services/graphql.client';
import { ApiError } from '@/utils/errors';

/** Where call recordings are filed: the server's `call-recordings` folder, under the uploader. */
export const RECORDINGS_FOLDER = 'call-recordings';

export interface UploadFile {
  uri: string;
  name: string;
  type: string;
}

/**
 * Upload one file the way every Duncit app does: a one-use ticket from
 * getImagekitAuth, then a multipart POST to the server's /upload route, which
 * stores it with the server's own credentials. Returns the stored file's URL.
 */
export async function uploadFile(file: UploadFile, folder: string): Promise<string> {
  const { getImagekitAuth } = await gqlRequest(CrmAppUploadTicketDocument, {
    folder,
    surface: 'MOBILE',
  });
  const form = new FormData();
  // React Native's FormData streams a { uri, name, type } part from disk.
  form.append('file', file as unknown as Blob);
  const target = `${getImagekitAuth.uploadUrl}?ticket=${encodeURIComponent(getImagekitAuth.ticket)}&fileName=${encodeURIComponent(file.name)}`;
  const res = await fetch(target, { method: 'POST', body: form });
  if (!res.ok) throw new ApiError(`Upload failed (HTTP ${res.status})`, res.status);
  const body = (await res.json()) as { url?: string };
  if (!body.url) throw new ApiError('Upload answered without a file URL');
  return body.url;
}
