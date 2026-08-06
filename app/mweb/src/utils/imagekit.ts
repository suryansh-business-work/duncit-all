import { useCallback, useState } from 'react';
import { gql, useMutation } from '@apollo/client';

/**
 * Where to send a file, and the one-shot pass that lets you.
 *
 * Uploads go to ImageKit THROUGH the server, on the private key. A browser
 * cannot sign an ImageKit upload, and the signed-from-the-browser scheme only
 * works while the account's public and private keys are a matched pair — a
 * mismatched pair rejects every upload and names no cause.
 */
export const GET_IMAGEKIT_AUTH = gql`
  mutation GetImagekitAuth($folder: String) {
    getImagekitAuth(folder: $folder) {
      uploadUrl
      ticket
      urlEndpoint
    }
  }
`;

interface UploadTicket {
  uploadUrl: string;
  ticket: string;
  urlEndpoint: string;
}

/** The raw file goes to our server, which passes it on. */
async function postToServer(file: File, ticket: UploadTicket): Promise<string> {
  const name = file.name || `upload-${Date.now()}`;
  const url =
    `${ticket.uploadUrl}?ticket=${encodeURIComponent(ticket.ticket)}` +
    `&fileName=${encodeURIComponent(name)}`;
  const form = new FormData();
  form.append('file', file, name);
  const res = await fetch(url, { method: 'POST', body: form });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message || 'Upload failed');
  }
  return json.url as string;
}

/**
 * Upload hook for support attachments and review photos. Streams the bytes
 * rather than base64-ing them through a mutation, which is what let large
 * attachments past the API body limit.
 */
export function useImagekitUpload() {
  const [getAuth] = useMutation(GET_IMAGEKIT_AUTH);
  const [uploading, setUploading] = useState(false);
  const upload = useCallback(
    async (file: File, folder: string): Promise<string> => {
      setUploading(true);
      try {
        // The pass is single use, so it is fetched per upload.
        const { data } = await getAuth({ variables: { folder } });
        const ticket = data?.getImagekitAuth as UploadTicket | undefined;
        if (!ticket) throw new Error('Upload is not available right now');
        return await postToServer(file, ticket);
      } finally {
        setUploading(false);
      }
    },
    [getAuth],
  );
  return { upload, uploading };
}
