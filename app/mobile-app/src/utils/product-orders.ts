import type { ResultOf } from '@graphql-typed-document-node/core';

import type { MyPodShopReturnsDocument } from '@/graphql/pod-shop-returns';
import type {
  MyProductOrdersDocument,
  MyProductOrdersForPodDocument,
} from '@/graphql/product-orders';

/**
 * The order shapes this app reads, from its own codegen.
 *
 * Everything that DECIDES anything — the status vocabulary, the ladder per
 * fulfilment method, the labels — lives in @duncit/utils, because mWeb and the
 * Products portal render the same order and the three copies had drifted apart
 * on which states a ladder even contains.
 */
export type ProductOrder = ResultOf<
  typeof MyProductOrdersForPodDocument
>['myProductOrdersForPod'][number];
export type ProductOrderLine = ProductOrder['line_items'][number];
/** A row of the all-orders history (the per-pod shape plus its pod). */
export type HistoryOrder = ResultOf<typeof MyProductOrdersDocument>['myProductOrders'][number];
/** One of the buyer's pod-shop returns. */
export type PodShopReturn = ResultOf<typeof MyPodShopReturnsDocument>['myPodShopReturns'][number];

export type { FulfilmentMethod, FulfilmentStatus, TimelineStep } from '@duncit/utils';
export { trackingUrl } from '@duncit/utils';
