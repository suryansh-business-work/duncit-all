import { useCallback, useEffect, useState } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import {
  BackoutPodDocument,
  EventTicketPdfDocument,
  MyEventTicketForPodDocument,
  MyPodMembershipsDocument,
  PodHistoryCategoriesDocument,
  PodInvoicePdfDocument,
  RejoinPodDocument,
} from '@/graphql/pod-history';
import { graphqlRequest } from '@/services/graphql.client';
import { dedupeByPod, type PodHistoryCategory, type PodMembership } from '@/utils/pod-history';

/**
 * Pod memberships for the history list + details — RN port of mWeb's
 * MY_POD_MEMBERSHIPS query. Exposes raw items (details find by id), the
 * pod-deduped list (the list screen) and a refetch.
 */
export function usePodHistory() {
  const [items, setItems] = useState<PodMembership[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>();

  const refetch = useCallback(async () => {
    const data = await graphqlRequest(MyPodMembershipsDocument, undefined, { auth: true });
    setItems(data.myPodMemberships);
  }, []);

  useEffect(() => {
    let active = true;
    refetch()
      .catch((err) => active && setError(err))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [refetch]);

  return { items, uniqueItems: dedupeByPod(items), isLoading, error, refetch };
}

/** Super + Category tree for the Pod History filter (fetched once). */
export function usePodHistoryCategories() {
  const [categories, setCategories] = useState<PodHistoryCategory[]>([]);

  useEffect(() => {
    let active = true;
    graphqlRequest(PodHistoryCategoriesDocument, undefined, { auth: true })
      .then((data) => {
        if (active) setCategories(data.categories);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  return categories;
}

/** Backout mutation with a busy flag — mWeb's BACKOUT_POD_HISTORY. */
export function usePodBackout() {
  const [busy, setBusy] = useState(false);

  const backout = useCallback(async (podDocId: string) => {
    setBusy(true);
    try {
      await graphqlRequest(BackoutPodDocument, { pod_doc_id: podDocId }, { auth: true });
    } finally {
      setBusy(false);
    }
  }, []);

  return { backout, busy };
}

/** Free rejoin mutation with a busy flag — mWeb's REJOIN_POD. */
export function usePodRejoin() {
  const [busy, setBusy] = useState(false);

  const rejoin = useCallback(async (podDocId: string) => {
    setBusy(true);
    try {
      await graphqlRequest(RejoinPodDocument, { pod_doc_id: podDocId }, { auth: true });
    } finally {
      setBusy(false);
    }
  }, []);

  return { rejoin, busy };
}

/**
 * Invoice download — fetches the base64 PDF, writes it to the cache and opens
 * the native share sheet (RN equivalent of mWeb's anchor download).
 */
export function usePodInvoice() {
  const [busy, setBusy] = useState(false);

  const download = useCallback(async (paymentId: string) => {
    setBusy(true);
    try {
      const data = await graphqlRequest(PodInvoicePdfDocument, { id: paymentId }, { auth: true });
      const base64 = data.paymentInvoicePdfBase64;
      if (!base64) throw new Error('Invoice not available');
      const uri = `${FileSystem.cacheDirectory}pod-invoice-${paymentId}.pdf`;
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

/**
 * Event-ticket download by pod — resolves the viewer's ticket for the pod, then
 * fetches the PDF and opens the native share sheet.
 */
export function usePodTicket() {
  const [busy, setBusy] = useState(false);

  const download = useCallback(async (podDocId: string) => {
    setBusy(true);
    try {
      const t = await graphqlRequest(
        MyEventTicketForPodDocument,
        { podId: podDocId },
        { auth: true },
      );
      const ticket = t.myEventTicketForPod;
      if (!ticket?.id) throw new Error('Ticket not available for this booking');
      const data = await graphqlRequest(EventTicketPdfDocument, { id: ticket.id }, { auth: true });
      const base64 = data.eventTicketPdfBase64;
      if (!base64) throw new Error('Ticket not available');
      const uri = `${FileSystem.cacheDirectory}ticket-${ticket.ticket_code}.pdf`;
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
