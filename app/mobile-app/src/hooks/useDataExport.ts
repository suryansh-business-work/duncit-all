import { useCallback, useState } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { MyDataExportDocument } from '@/graphql/privacy';
import { graphqlRequest } from '@/services/graphql.client';

/**
 * "Download my data" — the GDPR right of access and portability. The server
 * assembles the JSON (privacy.export.ts); this writes it to the cache and
 * opens the share sheet so the member can save or send it — the same pattern
 * as the policy PDF and the pod invoice. Same file name as mWeb's download.
 */
export function useDataExport() {
  const [busy, setBusy] = useState(false);

  const download = useCallback(async () => {
    setBusy(true);
    try {
      const data = await graphqlRequest(MyDataExportDocument, undefined, { auth: true });
      const day = new Date().toISOString().slice(0, 10);
      const uri = `${FileSystem.cacheDirectory}duncit-my-data-${day}.json`;
      await FileSystem.writeAsStringAsync(uri, data.myDataExport);
      // A code, not copy: the screen shows privacy.page.downloadFailed.
      if (!(await Sharing.isAvailableAsync())) throw new Error('SHARING_UNAVAILABLE');
      await Sharing.shareAsync(uri, { mimeType: 'application/json' });
    } finally {
      setBusy(false);
    }
  }, []);

  return { download, busy };
}
