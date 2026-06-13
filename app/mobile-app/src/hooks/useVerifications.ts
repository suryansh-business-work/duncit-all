import { useCallback, useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { MyVerificationsDocument, SubmitVerificationDocument } from '@/graphql/verification';
import { UploadImageDocument } from '@/graphql/status';
import { graphqlRequest } from '@/services/graphql.client';

export type Verification = ResultOf<typeof MyVerificationsDocument>['myVerifications'][number];

/** Loads the user's 7 verifications and uploads a document for one (picks an
 * image, pushes it to ImageKit, then submits it for review). B2-#9. */
export function useVerifications() {
  const [items, setItems] = useState<Verification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>();
  const [busyType, setBusyType] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await graphqlRequest(MyVerificationsDocument, undefined, { auth: true });
    setItems(data.myVerifications);
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

  const uploadFor = useCallback(
    async (type: Verification['type']) => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) throw new Error('Photo access is needed to upload a document.');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        base64: true,
        quality: 0.8,
      });
      const asset = result.canceled ? undefined : result.assets[0];
      if (!asset?.base64) return;
      setBusyType(type);
      try {
        const mimeType = asset.mimeType ?? 'image/jpeg';
        const uploaded = await graphqlRequest(
          UploadImageDocument,
          {
            fileBase64: `data:${mimeType};base64,${asset.base64}`,
            fileName: asset.fileName ?? `doc-${Date.now()}.jpg`,
            mimeType,
            folder: '/verifications',
          },
          { auth: true },
        );
        await graphqlRequest(
          SubmitVerificationDocument,
          { type, document_url: uploaded.uploadImageToImagekit.url },
          { auth: true },
        );
        await load();
      } finally {
        setBusyType(null);
      }
    },
    [load],
  );

  return { items, isLoading, error, busyType, uploadFor };
}
