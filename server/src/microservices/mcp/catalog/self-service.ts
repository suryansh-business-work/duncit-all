import type { McpCategoryKey } from './categories';

/**
 * Reads about the signed-in person's OWN data whose module is filed under a
 * console category (wallet → Finance, account health → Users & access …).
 * Filed only by module, a member — whose app serves `account`, not those
 * consoles — could never reach them, so "how much is in my wallet?" found no
 * tool. Each one is also offered under the member's `account` category.
 *
 * Every field here is a QUERY that takes no other person's id: the resolver
 * answers for the caller only, so listing it to every member widens nothing.
 * The tool keeps its name and its own category — it is listed in one more
 * place, never moved. Add a field only after checking its resolver is scoped
 * to the caller; writes never belong here.
 */
export const MEMBER_SELF_SERVICE_FIELDS: ReadonlySet<string> = new Set([
  // Users & access
  'myAccountHealth',
  'myAccountDeletionRequest',
  'myVerifications',
  // Finance
  'myPayments',
  'myPayment',
  'myWallet',
  'myWalletTransactions',
  'myWalletStatement',
  'myWithdrawals',
  // Loyalty
  'myCoinBalance',
  'myCoinTransactions',
  'myGiftCards',
  'myGiftCardOrders',
  'myGiftCardOrder',
  // Hosting
  'myHostRequest',
  'myHostRequests',
  // Communications
  'myMailPreferences',
  'myWhatsappPreference',
  // Venues (as a guest)
  'myRentalBookings',
  'myVenueFoodOrders',
  // Pod shop (as a buyer)
  'myProductOrders',
  'myPodShopReturns',
]);

const MEMBER_CATEGORY: McpCategoryKey = 'account';

/** The extra categories a tool is offered under, besides its own. */
export function alsoInFor(fieldName: string, kind: 'QUERY' | 'MUTATION', category: McpCategoryKey): McpCategoryKey[] | undefined {
  if (kind !== 'QUERY' || category === MEMBER_CATEGORY || !MEMBER_SELF_SERVICE_FIELDS.has(fieldName)) return undefined;
  return [MEMBER_CATEGORY];
}

/** Every category a tool is offered under. */
export const categoriesOf = (tool: { category: McpCategoryKey; alsoIn?: readonly McpCategoryKey[] }): readonly McpCategoryKey[] =>
  tool.alsoIn?.length ? [tool.category, ...tool.alsoIn] : [tool.category];
