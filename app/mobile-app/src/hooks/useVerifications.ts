import { useCallback, useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import type { ResultOf } from '@graphql-typed-document-node/core';

import {
  MyVerificationsDocument,
  SubmitAddressVerificationDocument,
  SubmitVerificationDocument,
} from '@/graphql/verification';
import { UploadImageDocument } from '@/graphql/status';
import { VerificationType } from '@/generated/graphql/graphql';
import { graphqlRequest } from '@/services/graphql.client';

export type Verification = ResultOf<typeof MyVerificationsDocument>['myVerifications'][number];

/** Structured address payload for the ADDRESS verification form. */
export interface AddressInput {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
}

/** Documents over 4 MB are rejected client-side before upload (server stores the URL only). */
export const MAX_DOC_BYTES = 4 * 1024 * 1024;

interface PickedDoc {
  base64: string;
  uri?: string;
  mimeType: string;
  fileName: string;
  size?: number | null;
}

/** Reads the document's byte size: the asset's reported size, else the base64 length. */
function byteSize(doc: PickedDoc): number {
  if (typeof doc.size === 'number') return doc.size;
  return Math.floor((doc.base64.length * 3) / 4);
}

/** Loads the user's 3 verifications (Identity/Address/Email) and submits an
 * IDENTITY document (image or PDF, 4 MB cap) or a structured ADDRESS form. */
export function useVerifications() {
  const [items, setItems] = useState<Verification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>();
  const [busyType, setBusyType] = useState<string | null>(null);
  const [docError, setDocError] = useState<string | null>(null);

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

  const pickImage = useCallback(async (): Promise<PickedDoc | null> => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) throw new Error('Photo access is needed to upload a document.');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      base64: true,
      quality: 0.8,
    });
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset?.base64) return null;
    return {
      base64: asset.base64,
      uri: asset.uri,
      mimeType: asset.mimeType ?? 'image/jpeg',
      fileName: asset.fileName ?? `doc-${Date.now()}.jpg`,
      size: asset.fileSize,
    };
  }, []);

  const pickPdf = useCallback(async (): Promise<PickedDoc | null> => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });
    const doc = result.canceled ? undefined : result.assets[0];
    if (!doc) return null;
    const base64 = await FileSystem.readAsStringAsync(doc.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return {
      base64,
      uri: doc.uri,
      mimeType: doc.mimeType ?? 'application/pdf',
      fileName: doc.name ?? `doc-${Date.now()}.pdf`,
      size: doc.size,
    };
  }, []);

  const submitIdentity = useCallback(
    async (doc: PickedDoc) => {
      if (byteSize(doc) > MAX_DOC_BYTES) {
        setDocError('File is too large — choose a document under 4 MB.');
        return;
      }
      setDocError(null);
      setBusyType('IDENTITY');
      try {
        const uploaded = await graphqlRequest(
          UploadImageDocument,
          {
            fileBase64: `data:${doc.mimeType};base64,${doc.base64}`,
            fileName: doc.fileName,
            mimeType: doc.mimeType,
            folder: '/verifications',
            allowDocuments: true,
          },
          { auth: true },
        );
        await graphqlRequest(
          SubmitVerificationDocument,
          { type: VerificationType.Identity, document_url: uploaded.uploadImageToImagekit.url },
          { auth: true },
        );
        await load();
      } finally {
        setBusyType(null);
      }
    },
    [load],
  );

  const uploadIdentityImage = useCallback(async () => {
    const doc = await pickImage();
    if (doc) await submitIdentity(doc);
  }, [pickImage, submitIdentity]);

  const uploadIdentityPdf = useCallback(async () => {
    const doc = await pickPdf();
    if (doc) await submitIdentity(doc);
  }, [pickPdf, submitIdentity]);

  const submitAddress = useCallback(
    async (values: AddressInput) => {
      setBusyType('ADDRESS');
      try {
        await graphqlRequest(SubmitAddressVerificationDocument, values, { auth: true });
        await load();
      } finally {
        setBusyType(null);
      }
    },
    [load],
  );

  return {
    items,
    isLoading,
    error,
    busyType,
    docError,
    uploadIdentityImage,
    uploadIdentityPdf,
    submitAddress,
  };
}
