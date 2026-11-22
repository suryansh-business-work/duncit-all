import { useCallback, useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { parseApiError } from '@duncit/utils';
import { FAILED_PAYMENT_EVIDENCE_LINK, type FailedPaymentEvidenceLinkData } from '../queries';

export interface OpenedEvidence {
  fileRef: string;
  url: string;
  kind: string;
}

/**
 * Evidence files are private: each open asks the server for a fresh,
 * short-lived signed link, and that link is never cached or kept beyond the
 * preview it was fetched for.
 */
export function useEvidenceLink(caseId: string) {
  const client = useApolloClient();
  const [opened, setOpened] = useState<OpenedEvidence | null>(null);
  const [loadingRef, setLoadingRef] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const openFile = useCallback(
    async (fileRef: string) => {
      setLoadingRef(fileRef);
      setError(null);
      try {
        const { data } = await client.query<FailedPaymentEvidenceLinkData>({
          query: FAILED_PAYMENT_EVIDENCE_LINK,
          variables: { caseId, fileRef },
          fetchPolicy: 'no-cache',
        });
        const link = data?.failedPaymentEvidenceLink;
        if (link) setOpened({ fileRef, url: link.url, kind: link.kind });
      } catch (err) {
        setError(parseApiError(err));
      } finally {
        setLoadingRef(null);
      }
    },
    [caseId, client],
  );

  const close = useCallback(() => setOpened(null), []);

  return { opened, loadingRef, error, openFile, close };
}
