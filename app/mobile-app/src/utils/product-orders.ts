import type { ResultOf } from '@graphql-typed-document-node/core';

import type { MyProductOrdersForPodDocument } from '@/graphql/product-orders';

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

export type { FulfilmentMethod, FulfilmentStatus, TimelineStep } from '@duncit/utils';
export { trackingUrl } from '@duncit/utils';
