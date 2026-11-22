import { useCallback, useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import type { AskDuncitAttachmentView } from '@duncit/utils';
import { logs } from '@duncit/logs';

import { useTranslation } from '@/hooks/useTranslation';
import { useUploadLimits } from '@/hooks/useUploadLimits';
import { uploadToImagekitDirect } from '@/services/imagekit-upload';

/** Images, PDFs and text files — the same list mWeb's composer accepts. */
const TYPES = ['image/*', 'application/pdf', 'text/plain', 'text/csv'];

const kindOf = (mime: string) => {
  if (mime.startsWith('image/')) return 'IMAGE';
  return mime === 'application/pdf' ? 'PDF' : 'FILE';
};

/**
 * Picking and uploading Ask Duncit attachments on native: through the shared
 * ImageKit direct upload (the server only accepts URLs on its own endpoint),
 * checked against the admin's upload limits first.
 */
export function useAskAttachments(max: number, onError: (message: string | null) => void) {
  const { t } = useTranslation();
  const limits = useUploadLimits();
  const [items, setItems] = useState<AskDuncitAttachmentView[]>([]);
  const [uploading, setUploading] = useState(false);

  const pick = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: TYPES,
      copyToCacheDirectory: true,
    });
    const doc = result.canceled ? undefined : result.assets[0];
    if (!doc) return;
    const mime = doc.mimeType ?? 'application/octet-stream';
    const overCap = limits.tooLarge({ mimeType: mime, size: doc.size });
    if (overCap) {
      onError(overCap);
      return;
    }
    onError(null);
    setUploading(true);
    try {
      const url = await uploadToImagekitDirect(
        { uri: doc.uri, name: doc.name, type: mime },
        '/ask-duncit',
      );
      setItems((prev) =>
        [...prev, { url, kind: kindOf(mime), name: doc.name, mime, size: doc.size ?? 0 }].slice(
          0,
          max,
        ),
      );
    } catch (error) {
      logs.mobileApp.warn('ask-duncit', 'upload', { error });
      onError(t('askDuncit.composer.uploadFailed'));
    } finally {
      setUploading(false);
    }
  }, [limits, max, onError, t]);

  const remove = useCallback(
    (url: string) => setItems((prev) => prev.filter((f) => f.url !== url)),
    [],
  );
  const clear = useCallback(() => setItems([]), []);

  return { items, uploading, pick, remove, clear };
}
