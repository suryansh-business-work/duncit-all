import { useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';

import type { ChatImageAsset } from '@/hooks/useChatRoom';
import { useTranslation } from '@/hooks/useTranslation';

interface Options {
  sendImage: (asset: ChatImageAsset) => Promise<void>;
  onError: (message: string) => void;
}

/** Picks a photo from the library and sends it to the room, asking for access
 * first. Lifted out of the room screen unchanged. */
export function useChatImagePicker({ sendImage, onError }: Options) {
  const { t } = useTranslation();
  return useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      onError(t('mweb.chatRoom.photoAccessIsNeededToSend'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      base64: true,
      quality: 0.8,
    });
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return;
    await sendImage({ base64: asset.base64, fileName: asset.fileName, mimeType: asset.mimeType });
  }, [sendImage, onError, t]);
}
