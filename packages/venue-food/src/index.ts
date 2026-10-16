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
export { default as VenueFoodMenu, type VenueFoodMenuProps } from './menu/VenueFoodMenu';

// The food block's fields, for a venue form that holds them beside its other
// sections (the Partners venue form, the Venues console editor). The rules are
// @duncit/forms/schemas' `makeVenueFoodRefinement`; the mapping @duncit/utils'.
export { default as VenueFoodFields, type VenueFoodFieldsProps } from './menu/fields/VenueFoodFields';
export { default as FoodGstinField } from './menu/fields/FoodGstinField';
export { sendsFoodAccount, type FoodAccountMode } from './menu/fields/FoodOrderingFields';
export type { AddFoodAccount } from './menu/fields/FoodAccountPicker';
export { FOOD_PHOTO_FOLDER, type FoodPhotoUpload } from './menu/fields/FoodDishPhotos';
// The venue's photo field itself: a rented item's photos (@duncit/venue-rentals) use the same one.
export { default as FoodDishPhotos } from './menu/fields/FoodDishPhotos';
// A venue's own videos (the Partners venue form, the Venues console editor) — the same field a dish uses.
export { default as VideoLinksField, type VideoLinksFieldProps } from './menu/fields/VideoLinksField';

// The dashboard's read-only panels, for a surface (or a demo) that has the numbers already.
export { default as FoodStatTiles } from './dashboard/FoodStatTiles';
export { default as FoodBreakdowns } from './dashboard/FoodBreakdowns';
export { default as FoodDailyChart } from './dashboard/FoodDailyChart';
export { default as FoodRecentFeedback } from './dashboard/FoodRecentFeedback';
export { default as FoodFeedbackBody, type FoodFeedbackContent } from './FoodFeedbackBody';

/** The owner's venues with whether each serves food — what every host page's venue picker reads. */
export { FOOD_OWNER_VENUES } from './documents';
