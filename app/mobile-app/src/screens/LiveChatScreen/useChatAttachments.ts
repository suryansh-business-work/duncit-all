import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

import type { useSupportChat } from '@/hooks/useSupportChat';
import { toErrorMessage } from '@/utils/errors';

type Upload = ReturnType<typeof useSupportChat>['uploadAttachment'];

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
    await uploadAndSend(asset, false);
  };

  const attachDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'application/msword', 'text/plain', 'text/csv'],
      copyToCacheDirectory: true,
    });
    const doc = result.canceled ? undefined : result.assets[0];
    if (!doc) return;
    await uploadAndSend({ uri: doc.uri, fileName: doc.name, mimeType: doc.mimeType }, true);
  };

  return { attach, attachDocument };
}
