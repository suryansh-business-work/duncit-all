import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

import type { useSupportChat } from '@/hooks/useSupportChat';
import { toErrorMessage } from '@/utils/errors';

type Upload = ReturnType<typeof useSupportChat>['uploadAttachment'];

// Images, videos and documents share a single 100 MB ceiling (support spec).
const MAX_BYTES = 100 * 1024 * 1024;

// Every document type accepted by the server (pdf / word / excel / powerpoint /
// text) — mirrors the mWeb composer's `accept` list.
const DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
];

interface Deps {
  uploadAttachment: Upload;
  submit: (text: string, attachments: string[]) => Promise<void>;
  setBusy: (v: boolean) => void;
  setSendError: (v: string) => void;
}

/** Image/document picking + upload for the live chat composer (B9) — kept out
 * of the screen so LiveChatScreen stays ≤200 lines. */
export function useChatAttachments({ uploadAttachment, submit, setBusy, setSendError }: Deps) {
  const uploadAndSend = async (asset: Parameters<Upload>[0], asDoc: boolean) => {
    setBusy(true);
    setSendError('');
    try {
      const url = await uploadAttachment(asset, asDoc);
      setBusy(false);
      await submit('', [url]);
    } catch (e) {
      setSendError(toErrorMessage(e, 'Could not attach the file.'));
      setBusy(false);
    }
  };

  const tooLarge = (size?: number | null) => {
    if (typeof size === 'number' && size > MAX_BYTES) {
      setSendError('File is too large (max 100 MB).');
      return true;
    }
    return false;
  };

  const attach = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setSendError('Photo access is needed to attach a file.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      base64: true,
      quality: 0.8,
    });
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return;
    if (tooLarge(asset.fileSize)) return;
    await uploadAndSend(asset, false);
  };

  const attachDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: DOCUMENT_TYPES,
      copyToCacheDirectory: true,
    });
    const doc = result.canceled ? undefined : result.assets[0];
    if (!doc) return;
    if (tooLarge(doc.size)) return;
    await uploadAndSend({ uri: doc.uri, fileName: doc.name, mimeType: doc.mimeType }, true);
  };

  return { attach, attachDocument };
}
