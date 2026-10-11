import { useCallback, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { shareBase64File } from '@/components/public-page/publicPageRequests';
import {
  MyProductOrderDocument,
  MyProductOrderSellerInvoiceDocument,
} from '@/graphql/order-detail';
import { PodInvoicePdfDocument } from '@/graphql/pod-history';
import { MyPodShopReturnsDocument } from '@/graphql/pod-shop-returns';
import { useReloadableQuery } from '@/hooks/useReloadableQuery';
import { useTranslation } from '@/hooks/useTranslation';
import { graphqlRequest } from '@/services/graphql.client';
import { toErrorMessage } from '@/utils/errors';
import type { PodShopReturn } from '@/utils/product-orders';

/** One of the buyer's own pod-shop orders, as the detail screen reads it. */
export type OrderDetail = NonNullable<ResultOf<typeof MyProductOrderDocument>['myProductOrder']>;

/** Which document is being fetched right now. */
export type OrderDownloadKind = 'invoice' | 'sellerInvoice';

/** What the last action did — said in place, since the app has no toast. */
export interface OrderNotice {
  tone: 'success' | 'error';
  text: string;
}

const PDF = 'application/pdf';

/**
 * One order of the buyer's, its returns, and the two documents it offers.
 * Both queries reload on pull-to-refresh (via useReloadableQuery) and together
 * through `reload`, because a return changes what is still returnable. A
 * document is handed to the OS share sheet, which is how this app saves a file.
 * RN twin of mWeb's order-detail-page (index + useOrderDownloads).
 */
export function useOrderDetail(orderId: string) {
  const { t } = useTranslation();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [returns, setReturns] = useState<PodShopReturn[]>([]);
  const [error, setError] = useState('');
  const [returnsError, setReturnsError] = useState('');
  const [notice, setNotice] = useState<OrderNotice | null>(null);
  const [downloading, setDownloading] = useState<OrderDownloadKind | null>(null);

  const loadOrder = useCallback(async () => {
    const data = await graphqlRequest(MyProductOrderDocument, { id: orderId }, { auth: true });
    setOrder(data.myProductOrder ?? null);
    setError('');
  }, [orderId]);
  const loadReturns = useCallback(async () => {
    const data = await graphqlRequest(MyPodShopReturnsDocument, undefined, { auth: true });
    setReturns(data.myPodShopReturns.filter((ret) => ret.order_id === orderId));
    setReturnsError('');
  }, [orderId]);

  const orderQuery = useReloadableQuery(loadOrder, {
    onError: (e) => setError(toErrorMessage(e, t('mweb.orderDetail.loadFailed'))),
  });
  const returnsQuery = useReloadableQuery(loadReturns, {
    onError: () => setReturnsError(t('mweb.podShopReturns.loadFailed')),
  });
  const { refetch: refetchOrder } = orderQuery;
  const { refetch: refetchReturns } = returnsQuery;
  const reload = useCallback(
    () => Promise.all([refetchOrder(), refetchReturns()]),
    [refetchOrder, refetchReturns],
  );

  /** Fetches one document and shares it; `fetchFile` answers the PDF and its file name. */
  const download = async (
    kind: OrderDownloadKind,
    fetchFile: () => Promise<{ base64: string; fileName: string; mime: string }>,
  ) => {
    setDownloading(kind);
    setNotice(null);
    try {
      const file = await fetchFile();
      if (!file.base64) throw new Error(t('mweb.orderDetail.downloadFailed'));
      const shared = await shareBase64File(file.base64, file.fileName, file.mime);
      if (!shared) setNotice({ tone: 'error', text: t('mweb.orderDetail.noShareSheet') });
    } catch (e) {
      setNotice({ tone: 'error', text: toErrorMessage(e, t('mweb.orderDetail.downloadFailed')) });
    } finally {
      setDownloading(null);
    }
  };

  return {
    order,
    returns,
    isLoading: orderQuery.isLoading,
    error,
    returnsError,
    notice,
    setNotice,
    downloading,
    reload,
    /** Duncit's invoice for the payment behind the order — the payer's own. */
    downloadInvoice: (target: Pick<OrderDetail, 'order_no' | 'payment_id'>) =>
      download('invoice', async () => {
        const data = await graphqlRequest(
          PodInvoicePdfDocument,
          { id: target.payment_id },
          { auth: true },
        );
        return {
          base64: data.paymentInvoicePdfBase64,
          fileName: `invoice-${target.order_no}.pdf`,
          mime: PDF,
        };
      }),
    /** The seller's tax invoice for the shipment — refused, in words, until it is booked. */
    downloadSellerInvoice: (target: Pick<OrderDetail, 'id'>) =>
      download('sellerInvoice', async () => {
        const data = await graphqlRequest(
          MyProductOrderSellerInvoiceDocument,
          { id: target.id },
          { auth: true },
        );
        const file = data.myProductOrderSellerInvoice;
        return {
          base64: file.content_base64,
          fileName: `seller-${file.filename}`,
          mime: file.mime,
        };
      }),
  };
}
