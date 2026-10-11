import { useCallback, useState } from 'react';
import type { VariablesOf } from '@graphql-typed-document-node/core';
import type { WalletStatementFile, WalletStatementVariables } from '@duncit/forms/schemas';

import { shareBase64File } from '@/components/public-page/publicPageRequests';
import { WalletStatementFileDocument } from '@/graphql/wallet';
import { graphqlRequest } from '@/services/graphql.client';

/** A code, not copy: the dialog shows `withdraw.statement.sharingUnavailable` for it. */
export const STATEMENT_SHARING_UNAVAILABLE = 'STATEMENT_SHARING_UNAVAILABLE';

/**
 * Fetch the signed-in user's wallet statement for a period and hand the file to
 * the OS share sheet (save to Files, mail it, open it) — the native twin of
 * mWeb's browser download. The server only ever answers with the caller's own
 * statement; the period and format come from the shared form contract.
 */
export function useWalletStatement() {
  const [busy, setBusy] = useState(false);

  const download = useCallback(
    async (variables: WalletStatementVariables): Promise<WalletStatementFile> => {
      setBusy(true);
      try {
        const data = await graphqlRequest(
          WalletStatementFileDocument,
          // The generated `WalletStatementFormat` is a string enum whose members
          // ARE 'PDF' | 'CSV', so the shared builder's output already matches;
          // the assertion only tells TypeScript that.
          variables as VariablesOf<typeof WalletStatementFileDocument>,
          { auth: true },
        );
        const file = data.myWalletStatementFile;
        const shared = await shareBase64File(file.content_base64, file.filename, file.mime);
        if (!shared) throw new Error(STATEMENT_SHARING_UNAVAILABLE);
        return file;
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  return { download, busy };
}
