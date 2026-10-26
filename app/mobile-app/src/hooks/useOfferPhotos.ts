import { useCallback, useRef, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { VENUE_OFFER_IMAGES_MAX } from '@duncit/forms/schemas';
import { logs } from '@duncit/logs';

import { uploadChatImage } from '@/hooks/useChatRoom';
import { useTranslation } from '@/hooks/useTranslation';
import { toErrorMessage } from '@/utils/errors';

/** Up to `room` photos from the library; null when access was refused, [] when none was picked. */
async function pickPhotos(room: number): Promise<ImagePicker.ImagePickerAsset[] | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;
  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    base64: true,
    quality: 0.8,
    allowsMultipleSelection: room > 1,
    selectionLimit: room,
  });
  return picked.canceled ? [] : picked.assets.slice(0, room);
}

/**
 * Photos attached to a counter offer: picked from the device's library (photos
 * only — never stock images or videos, which the server refuses) and uploaded
 * to ImageKit the way a chat photo is, up to the server's four. Each upload
 * joins the list as it lands, so a later failure keeps the earlier ones.
 * `images` is the form's list; `onChange` writes it back.
 */
export function useOfferPhotos(images: readonly string[], onChange: (next: string[]) => void) {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The list as the form holds it now — read after the picker returns, not when it opened.
  const current = useRef(images);
  current.current = images;

  const add = useCallback(async () => {
    const room = VENUE_OFFER_IMAGES_MAX - current.current.length;
    if (room <= 0) return;
    setError(null);
    try {
      const assets = await pickPhotos(room);
      if (!assets) {
        setError(t('mweb.chatRoom.photoAccessIsNeededToSend'));
        return;
      }
      setUploading(true);
      let next = [...current.current];
      for (const asset of assets) {
        if (!asset.base64) continue;
        const url = await uploadChatImage({
          base64: asset.base64,
          fileName: asset.fileName,
          mimeType: asset.mimeType,
        });
        next = [...next, url].slice(0, VENUE_OFFER_IMAGES_MAX);
        onChange(next);
      }
    } catch (err: unknown) {
      logs.mobileApp.warn('offerPhotos', 'upload', { error: err });
      setError(toErrorMessage(err, t('availability.offers.chat.actionFailed')));
    } finally {
      setUploading(false);
    }
  }, [onChange, t]);

  return { add, uploading, error, full: images.length >= VENUE_OFFER_IMAGES_MAX };
}
