import type { PageCopy } from './types';

/** Money > Shop. */
export const SHOP_COPY: PageCopy = {
  kpis: {
    shop_orders: { title: 'analytics.kpi.shopOrders', hint: 'analytics.kpi.shopOrdersHint' },
    shop_order_value: { title: 'analytics.kpi.shopOrderValue', hint: 'analytics.kpi.shopOrderValueHint' },
    shop_avg_order: { title: 'analytics.kpi.shopAvgOrder', hint: 'analytics.kpi.shopAvgOrderHint' },
    shop_cod_share: { title: 'analytics.kpi.shopCodShare', hint: 'analytics.kpi.shopCodShareHint' },
    shop_cancellation_rate: { title: 'analytics.kpi.shopCancellationRate', hint: 'analytics.kpi.shopCancellationRateHint' },
    shop_returns: { title: 'analytics.kpi.shopReturns', hint: 'analytics.kpi.shopReturnsHint' },
    shop_fulfilment_days: { title: 'analytics.kpi.shopFulfilmentDays', hint: 'analytics.kpi.shopFulfilmentDaysHint' },
    shop_open_orders: { title: 'analytics.kpi.shopOpenOrders', hint: 'analytics.kpi.shopOpenOrdersHint' },
    shop_products_on_sale: { title: 'analytics.kpi.shopProductsOnSale', hint: 'analytics.kpi.shopProductsOnSaleHint' },
    shop_store_listed: { title: 'analytics.kpi.shopStoreListed', hint: 'analytics.kpi.shopStoreListedHint' },
    shop_low_stock: { title: 'analytics.kpi.shopLowStock', hint: 'analytics.kpi.shopLowStockHint' },
    shop_out_of_stock: { title: 'analytics.kpi.shopOutOfStock', hint: 'analytics.kpi.shopOutOfStockHint' },
  },
  trends: {
    shop_orders: { title: 'analytics.trend.shopOrders', hint: 'analytics.trend.shopOrdersHint' },
    shop_order_value: { title: 'analytics.trend.shopOrderValue', hint: 'analytics.trend.shopOrderValueHint' },
    shop_cancellations: { title: 'analytics.trend.shopCancellations', hint: 'analytics.trend.shopCancellationsHint' },
  },
  series: {
    shop_pod_shop: 'analytics.series.shopPodShop',
    shop_pet_store: 'analytics.series.shopPetStore',
    shop_cancelled: 'analytics.series.shopCancelled',
  },
  breakdowns: {
    shop_by_channel: 'analytics.breakdown.shopByChannel',
    shop_payment_method: 'analytics.breakdown.shopPaymentMethod',
    shop_fulfilment_status: 'analytics.breakdown.shopFulfilmentStatus',
    shop_fulfilment_method: 'analytics.breakdown.shopFulfilmentMethod',
    shop_by_courier: 'analytics.breakdown.shopByCourier',
    shop_return_reasons: 'analytics.breakdown.shopReturnReasons',
  },
  slices: {
    shop_by_channel: {
      POD_SHOP: 'analytics.slice.shopPodShop',
      PET_STORE: 'analytics.slice.shopPetStore',
    },
    shop_payment_method: {
      PREPAID: 'analytics.slice.shopPrepaid',
      COD: 'analytics.slice.shopCod',
    },
    shop_fulfilment_status: {
      PENDING: 'analytics.slice.shopPending',
      AWAITING_SHIPMENT: 'analytics.slice.shopAwaitingShipment',
      AWB_ASSIGNED: 'analytics.slice.shopAwbAssigned',
      PICKUP_SCHEDULED: 'analytics.slice.shopPickupScheduled',
      SHIPPED: 'analytics.slice.shopShipped',
      OUT_FOR_DELIVERY: 'analytics.slice.shopOutForDelivery',
      DELIVERED: 'analytics.slice.shopDelivered',
      READY_FOR_PICKUP: 'analytics.slice.shopReadyForPickup',
      PICKED_UP: 'analytics.slice.shopPickedUp',
      CANCELLED: 'analytics.slice.shopCancelled',
      RTO: 'analytics.slice.shopRto',
      FAILED: 'analytics.slice.shopFailed',
    },
    shop_fulfilment_method: {
      SHIP: 'analytics.slice.shopShip',
      PICKUP: 'analytics.slice.shopPickup',
    },
  },
  leaderboards: {
    shop_top_products: {
      title: 'analytics.leaderboard.shopTopProducts',
      hint: 'analytics.leaderboard.shopTopProductsHint',
      name: 'analytics.leaderboard.shopProduct',
      empty: 'analytics.page.noData',
    },
  },
  columns: {
    shop_col_units: 'analytics.leaderboard.shopColUnits',
    shop_col_revenue: 'analytics.leaderboard.shopColRevenue',
    shop_col_orders: 'analytics.leaderboard.shopColOrders',
  },
};
