export { getOrCreateDuid } from './duid';
export {
  GENERIC_ERROR_MESSAGE,
  OFFLINE_MESSAGE,
  isNetworkFailureMessage,
  parseApiError,
} from './parse-api-error';
export { formatINR, formatMoney, type FormatMoneyOptions } from './format-money';
export { base64ToBlob, downloadBase64File, downloadBlob, downloadTextFile } from './download';
export { fileToBase64, fileToDataUrl } from './file-to-base64';
export { formatMjml } from './mjml-format';
export { nationalPhoneDigits } from './phone';
export { isStoryLive } from './story-live';
export {
  clubCategoryKey,
  productMatchesClub,
  filterProductsForClub,
  pruneProductRequests,
  type ClubCategoryKey,
} from './product-category';
export {
  HOST_FREE_SPOT_NOTE,
  SPOTS_HARD_MAX,
  payableSpots,
  payingAttendees,
  spotsBounds,
  type SpotsBounds,
} from './pod-spots';
export {
  CART_BADGE_MAX,
  cartBadgeLabel,
  deriveCartEntry,
  isCartFlowRoute,
  type CartEntry,
} from './cart-entry';
export {
  buildEarningsStatement,
  formatStatementMoney,
  type EarningsStatement,
  type EarningsStatementOptions,
  type EarningsWaterfall,
  type StatementLine,
  type StatementSection,
} from './earnings-statement';
