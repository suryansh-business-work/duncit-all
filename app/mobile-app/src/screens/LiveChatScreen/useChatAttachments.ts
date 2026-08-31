import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

import type { useSupportChat } from '@/hooks/useSupportChat';
import { toErrorMessage } from '@/utils/errors';
import { useUploadLimits } from '@/hooks/useUploadLimits';

type Upload = ReturnType<typeof useSupportChat>['uploadAttachment'];

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
  onStage: (url: string) => void;
  setBusy: (v: boolean) => void;
  setSendError: (v: string) => void;
}

/** Image/document picking + upload for the live chat composer (B9) — kept out
 * of the screen so LiveChatScreen stays ≤200 lines. Uploaded files are staged
 * (previewed in the composer) rather than sent immediately. */
export function useChatAttachments({ uploadAttachment, onStage, setBusy, setSendError }: Deps) {
  const limits = useUploadLimits();
  const uploadAndStage = async (asset: Parameters<Upload>[0]) => {
    setBusy(true);
    setSendError('');
    try {
      const url = await uploadAttachment(asset);
      setBusy(false);
      onStage(url);
    } catch (e) {
      setSendError(toErrorMessage(e, 'Could not attach the file.'));
      setBusy(false);
    }
  };

  const tooLarge = (size: number | null | undefined, mimeType: string) => {
    const overCap = limits.tooLarge({ mimeType, size });
    if (!overCap) return false;
    setSendError(overCap);
    return true;
  };

  const attach = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setSendError('Photo access is needed to attach a file.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.8,
    });
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return;
    if (tooLarge(asset.fileSize, asset.type === 'video' ? 'video/mp4' : 'image/jpeg')) return;
    await uploadAndStage(asset);
  };

  const attachDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: DOCUMENT_TYPES,
      copyToCacheDirectory: true,
    });
    const doc = result.canceled ? undefined : result.assets[0];
    if (!doc) return;
    if (tooLarge(doc.size, doc.mimeType ?? 'application/octet-stream')) return;
    await uploadAndStage({ uri: doc.uri, fileName: doc.name, mimeType: doc.mimeType });
  };

  return { attach, attachDocument };
}
