import { useCallback, useState } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { PolicyPdfDocument } from '@/graphql/policies';
import { graphqlRequest } from '@/services/graphql.client';

/**
 * Policy PDF download — fetches the server-rendered base64 PDF, writes it to
 * the cache and opens the native share sheet so the user can view, zoom, share
 * or save it (same pattern as the pod invoice download).
 */
export function usePolicyPdf() {
  const [busy, setBusy] = useState(false);

  const download = useCallback(async (slug: string) => {
    setBusy(true);
    try {
      const data = await graphqlRequest(PolicyPdfDocument, { slug }, { auth: true });
      const base64 = data.policyPdfBase64;
      if (!base64) throw new Error('PDF not available');
      const uri = `${FileSystem.cacheDirectory}policy-${slug}.pdf`;
      await FileSystem.writeAsStringAsync(uri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      if (!(await Sharing.isAvailableAsync()))
        throw new Error('Sharing is not available on this device');
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
    } finally {
      setBusy(false);
    }
  }, []);

  return { download, busy };
}
