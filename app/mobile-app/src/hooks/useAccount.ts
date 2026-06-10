import { useCallback, useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import type { ResultOf, VariablesOf } from '@graphql-typed-document-node/core';

import {
  MobileAccountDocument,
  MobileAccountHealthDocument,
  MobileUpdateProfileDocument,
} from '@/graphql/account';
import { UploadImageDocument } from '@/graphql/status';
import { graphqlRequest } from '@/services/graphql.client';
import { useMeStore } from '@/stores/me.store';

export type AccountData = ResultOf<typeof MobileAccountDocument>;
export type AccountMe = NonNullable<AccountData['me']>;
export type AccountHealth = ResultOf<typeof MobileAccountHealthDocument>['myAccountHealth'];
export type UpdateProfileInput = VariablesOf<typeof MobileUpdateProfileDocument>['input'];

/**
 * Profile-settings data + mutations — RN twin of mWeb's AccountPage hooks. Loads
 * the full `me` record and account health, and exposes profile/photo updates that
 * refresh both this screen and the shared `me` store (so the header avatar syncs).
 */
export function useAccount() {
  const [me, setMe] = useState<AccountMe | null>(null);
  const [health, setHealth] = useState<AccountHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>();
  const [savingPhoto, setSavingPhoto] = useState(false);

  const load = useCallback(async () => {
    const [account, healthResult] = await Promise.all([
      graphqlRequest(MobileAccountDocument, undefined, { auth: true }),
      graphqlRequest(MobileAccountHealthDocument, undefined, { auth: true }),
    ]);
    setMe(account.me ?? null);
    setHealth(healthResult.myAccountHealth ?? null);
  }, []);

  useEffect(() => {
    let active = true;
    load()
      .catch((err) => active && setError(err))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [load]);

  const refresh = useCallback(async () => {
    await load();
    await useMeStore.getState().refetch();
  }, [load]);

  const updateProfile = useCallback(
    async (input: UpdateProfileInput) => {
      await graphqlRequest(MobileUpdateProfileDocument, { input }, { auth: true });
      await refresh();
    },
    [refresh],
  );

  const changePhoto = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) throw new Error('Photo access is needed to update your photo.');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      base64: true,
      quality: 0.8,
    });
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset?.base64) return;

    setSavingPhoto(true);
    try {
      const mimeType = asset.mimeType ?? 'image/jpeg';
      const uploaded = await graphqlRequest(
        UploadImageDocument,
        {
          fileBase64: `data:${mimeType};base64,${asset.base64}`,
          fileName: asset.fileName ?? `avatar-${Date.now()}.jpg`,
          mimeType,
          folder: '/users',
        },
        { auth: true },
      );
      await updateProfile({ profile_photo: uploaded.uploadImageToImagekit.url });
    } finally {
      setSavingPhoto(false);
    }
  }, [updateProfile]);

  return { me, health, isLoading, error, savingPhoto, updateProfile, changePhoto };
}
