import { useCallback, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';

import { UploadImageDocument } from '@/graphql/status';
import { graphqlRequest } from '@/services/graphql.client';
import { useMeStore } from '@/stores/me.store';
import { MobileUpdateProfileDocument } from '@/graphql/account';

/** A picked, on-device image awaiting crop/zoom/rotate before upload. */
export interface PickedPhoto {
  uri: string;
  width: number;
  height: number;
  fileName?: string | null;
  mimeType?: string | null;
}

/** The cropped output handed back by the crop UI, ready to upload. */
export interface CroppedPhoto {
  base64: string;
  mimeType: string;
  fileName: string;
}

/**
 * Profile-photo pipeline for the Instagram-style avatar menu (item 9): pick an
 * image, crop/zoom/rotate it in the crop dialog, then upload to ImageKit and
 * persist via `updateMyProfile`. Also removes the photo (sets it to null). After
 * each write the shared `me` store refetches so every avatar updates at once.
 */
export function useProfilePhoto(onChanged?: () => void | Promise<void>) {
  const [picked, setPicked] = useState<PickedPhoto | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    await useMeStore.getState().refetch();
    await onChanged?.();
  }, [onChanged]);

  /** Open the library and stage the chosen image for cropping. */
  const pick = useCallback(async () => {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo access is needed to update your photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return;
    setPicked({
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
      fileName: asset.fileName,
      mimeType: asset.mimeType,
    });
  }, []);

  /** Upload the cropped result and persist it on the profile. */
  const upload = useCallback(
    async (cropped: CroppedPhoto) => {
      setSaving(true);
      setError(null);
      try {
        const uploaded = await graphqlRequest(
          UploadImageDocument,
          {
            fileBase64: `data:${cropped.mimeType};base64,${cropped.base64}`,
            fileName: cropped.fileName,
            mimeType: cropped.mimeType,
            folder: '/users',
          },
          { auth: true },
        );
        await graphqlRequest(
          MobileUpdateProfileDocument,
          { input: { profile_photo: uploaded.uploadImageToImagekit.url } },
          { auth: true },
        );
        setPicked(null);
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not update photo.');
      } finally {
        setSaving(false);
      }
    },
    [refresh],
  );

  /** Clear the avatar (profile_photo → null). */
  const remove = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      await graphqlRequest(
        MobileUpdateProfileDocument,
        { input: { profile_photo: null } },
        { auth: true },
      );
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove photo.');
    } finally {
      setSaving(false);
    }
  }, [refresh]);

  const cancelPick = useCallback(() => setPicked(null), []);

  return { picked, saving, error, pick, upload, remove, cancelPick };
}
