export type FulfilmentMethod = 'SHIP' | 'PICKUP';

export type FulfilmentStatus =
  | 'PENDING'
  | 'AWAITING_SHIPMENT'
  | 'AWB_ASSIGNED'
  | 'PICKUP_SCHEDULED'
  | 'SHIPPED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'READY_FOR_PICKUP'
  | 'PICKED_UP'
  | 'CANCELLED'
  | 'RTO'
  | 'FAILED';

export const ALL_STATUSES: FulfilmentStatus[] = [
  'PENDING',
  'AWAITING_SHIPMENT',
  'AWB_ASSIGNED',
  'PICKUP_SCHEDULED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'READY_FOR_PICKUP',
  'PICKED_UP',
  'CANCELLED',
  'RTO',
  'FAILED',
];

/** Ordered forward flows per fulfilment method — drives the status stepper. */
export const SHIP_FLOW: FulfilmentStatus[] = [
  'PENDING',
  'AWAITING_SHIPMENT',
  'AWB_ASSIGNED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];

export const PICKUP_FLOW: FulfilmentStatus[] = [
  'PENDING',
  'PICKUP_SCHEDULED',
  'READY_FOR_PICKUP',
  'PICKED_UP',
];

export const STATUS_COLOR: Record<FulfilmentStatus, 'default' | 'info' | 'success' | 'warning' | 'error'> = {
  PENDING: 'warning',
  AWAITING_SHIPMENT: 'warning',
  AWB_ASSIGNED: 'info',
  PICKUP_SCHEDULED: 'info',
  SHIPPED: 'info',
  OUT_FOR_DELIVERY: 'info',
  DELIVERED: 'success',
  READY_FOR_PICKUP: 'info',
  PICKED_UP: 'success',
  CANCELLED: 'default',
  RTO: 'error',
  FAILED: 'error',
};

export const humaniseStatus = (status: string) =>
  status.replaceAll('_', ' ').replaceAll(/\b\w/g, (character) => character.toUpperCase());
