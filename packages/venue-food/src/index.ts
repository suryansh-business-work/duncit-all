/**
 * `@duncit/venue-food` — a venue's food desk as its owner works it, as ONE MUI
 * set for the Partners console, the Venues console and mWeb.
 *
 * Each tool is self-contained and takes the venue it is about; picking the
 * venue (and saying what to do when it does not serve food) stays with the
 * page that mounts it. The contract is @duncit/utils' `venue-food-owner` and
 * the form rules are @duncit/forms/schemas', so the native app's Tamagui twins
 * read the same documents, labels and rules.
 */
export { default as VenueFoodDashboard, type VenueFoodDashboardProps } from './dashboard/VenueFoodDashboard';
export { default as VenueFoodOrders } from './orders/VenueFoodOrders';
export { default as VenueFoodCoupons } from './coupons/VenueFoodCoupons';
export type { VenueFoodTableProps } from './types';

// The dashboard's read-only panels, for a surface (or a demo) that has the numbers already.
export { default as FoodStatTiles } from './dashboard/FoodStatTiles';
export { default as FoodBreakdowns } from './dashboard/FoodBreakdowns';
export { default as FoodDailyChart } from './dashboard/FoodDailyChart';
export { default as FoodRecentFeedback } from './dashboard/FoodRecentFeedback';
export { default as FoodFeedbackBody, type FoodFeedbackContent } from './FoodFeedbackBody';

/** The owner's venues with whether each serves food — what every host page's venue picker reads. */
export { FOOD_OWNER_VENUES } from './documents';
