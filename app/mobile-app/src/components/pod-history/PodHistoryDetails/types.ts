import type { PodMembership } from '@/utils/pod-history';
import type { ProductOrder } from '@/utils/product-orders';

export interface PodHistoryDetailsProps {
  item: PodMembership;
  /** True once the server says this pod has no Backout attempts left. Absent
   * while that query is still open, which renders the same as "not maxed". */
  backoutMaxed?: boolean;
  backingOut: boolean;
  rejoining: boolean;
  invoiceBusy: boolean;
  ticketBusy: boolean;
  notice: string | null;
  deductionPct: number;
  productOrders?: ProductOrder[];
  ordersLoading?: boolean;
  onPodDetails: () => void;
  onBackout: () => void;
  /** Pressed instead of onBackout once the attempts are spent — says why. */
  onBackoutBlocked?: () => void;
  onRejoin: () => void;
  onRefundStatus: () => void;
  onInvoice: () => void;
  onTicket: () => void;
  onSupport: () => void;
  onBackoutTerms: () => void;
  onGeneralTerms: () => void;
}
