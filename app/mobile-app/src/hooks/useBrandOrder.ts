import { useCallback, useState } from 'react';
import { Linking } from 'react-native';
import type { ResultOf } from '@graphql-typed-document-node/core';
import type { ShipToValues } from '@duncit/forms/schemas';
import type { ShipmentDocumentKind as DocumentKind } from '@duncit/utils';

import { shareBase64File } from '@/components/public-page/publicPageRequests';
import { ShipmentDocumentKind } from '@/generated/graphql/graphql';
import {
  BrandBookShipmentDocument,
  BrandOrderDocument,
  BrandRefreshTrackingDocument,
  BrandShipmentFileDocument,
  BrandUpdateAddressDocument,
} from '@/graphql/brand-orders';
import { useReloadableQuery } from '@/hooks/useReloadableQuery';
import { useTranslation } from '@/hooks/useTranslation';
import { graphqlRequest } from '@/services/graphql.client';
import { toErrorMessage } from '@/utils/errors';
import { fireAndForget } from '@/utils/fire-and-forget';

/** The shared document kinds as this app's codegen names them. */
const KIND: Readonly<Record<DocumentKind, ShipmentDocumentKind>> = {
  LABEL: ShipmentDocumentKind.Label,
  INVOICE: ShipmentDocumentKind.Invoice,
  MANIFEST: ShipmentDocumentKind.Manifest,
};

/** Where ShipRocket keeps each document as a link of its own. */
const DOCUMENT_URL = {
  LABEL: 'label_url',
  INVOICE: 'invoice_url',
  MANIFEST: 'manifest_url',
} as const satisfies Record<DocumentKind, string>;

export type BrandOrder = NonNullable<ResultOf<typeof BrandOrderDocument>['brandProductOrder']>;

/** What the last action did — said in place, since the app has no toast. */
export interface BrandOrderNotice {
  tone: 'success' | 'error';
  text: string;
}

/**
 * One order of the partner's brands and what can be done with it. Each action
 * answers with the order, which replaces the one on screen, and leaves a
 * notice. RN twin of mWeb's BrandOrderDetailPage + useBrandOrderActions.
 */
export function useBrandOrder(id: string) {
  const { t } = useTranslation();
  const [order, setOrder] = useState<BrandOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<BrandOrderNotice | null>(null);

  const load = useCallback(async () => {
    const data = await graphqlRequest(BrandOrderDocument, { id }, { auth: true });
    setOrder(data.brandProductOrder ?? null);
    setError(null);
  }, [id]);
  const { isLoading, refetch } = useReloadableQuery(load, {
    onError: (err) => setError(toErrorMessage(err, t('mweb.brandOrders.loadFailed'))),
  });

  /** Runs one action; true when it went through. */
  const act = async (work: () => Promise<BrandOrderNotice | null>): Promise<boolean> => {
    setBusy(true);
    setNotice(null);
    try {
      setNotice(await work());
      return true;
    } catch (err) {
      setNotice({ tone: 'error', text: toErrorMessage(err, t('mweb.brandOrders.actionFailed')) });
      return false;
    } finally {
      setBusy(false);
    }
  };
  const ok = (key: string): BrandOrderNotice => ({ tone: 'success', text: t(key) });

  return {
    order,
    isLoading,
    error,
    busy,
    notice,
    retry: () => {
      // A failed reload lands in `error` through onError; this only hands the promise off.
      fireAndForget(refetch());
    },
    /** A booking that stopped part-way answers with the order and its reason, not an error. */
    book: () =>
      act(async () => {
        const data = await graphqlRequest(BrandBookShipmentDocument, { id }, { auth: true });
        const next = data.brandBookProductOrderShipment;
        setOrder(next);
        if (!next.last_error) return ok('mweb.brandOrders.booked');
        return {
          tone: 'error',
          text: t('mweb.brandOrders.bookingFailed', { vars: { error: next.last_error } }),
        };
      }),
    refreshTracking: () =>
      act(async () => {
        const data = await graphqlRequest(BrandRefreshTrackingDocument, { id }, { auth: true });
        setOrder(data.brandRefreshProductOrderTracking);
        return ok('mweb.brandOrders.trackingRefreshed');
      }),
    saveAddress: (values: ShipToValues) =>
      act(async () => {
        const address = { ...values, email: order?.shipping_address?.email ?? '' };
        const data = await graphqlRequest(
          BrandUpdateAddressDocument,
          { id, address },
          { auth: true },
        );
        setOrder(data.brandUpdateProductOrderAddress);
        return ok('mweb.brandOrders.addressSaved');
      }),
    /**
     * A label, invoice or manifest. Saving hands the PDF to the OS share sheet;
     * printing opens ShipRocket's own copy (this app has no print module), and
     * falls back to the share sheet — which offers Print — when there is none.
     */
    document: (kind: DocumentKind, mode: 'print' | 'download') =>
      act(async () => {
        const url = order?.shiprocket[DOCUMENT_URL[kind]];
        if (mode === 'print' && url) {
          await Linking.openURL(url);
          return null;
        }
        const data = await graphqlRequest(
          BrandShipmentFileDocument,
          { ids: [id], kind: KIND[kind] },
          { auth: true },
        );
        const file = data.brandProductOrderShipmentFile;
        const shared = await shareBase64File(file.content_base64, file.filename, file.mime);
        return shared ? null : { tone: 'error', text: t('mweb.brandOrders.noShareSheet') };
      }),
  };
}
