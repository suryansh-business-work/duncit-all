/** Every storefront address, built in one place. */
export const paths = {
  home: '/',
  shop: '/shop',
  product: (slug: string) => `/p/${encodeURIComponent(slug)}`,
  category: (slug: string) => `/c/${encodeURIComponent(slug)}`,
  petType: (slug: string) => `/pet/${encodeURIComponent(slug)}`,
  collection: (slug: string) => `/collections/${encodeURIComponent(slug)}`,
  brand: (id: string) => `/brand/${encodeURIComponent(id)}`,
  brands: '/brands',
  search: (q: string) => `/search?q=${encodeURIComponent(q)}`,
  cart: '/cart',
  checkout: '/checkout',
  wishlist: '/wishlist',
  account: '/account',
  orders: '/account/orders',
  order: (orderNo: string) => `/account/orders/${encodeURIComponent(orderNo)}`,
  addresses: '/account/addresses',
  returns: '/account/returns',
  petProfile: '/account/pet',
  autoship: '/autoship',
  track: '/track',
  guestOrder: (orderNo: string, key: string) =>
    `/track?order=${encodeURIComponent(orderNo)}&key=${encodeURIComponent(key)}`,
  orderSuccess: (paymentDocId: string, key: string) =>
    `/order/success?payment=${encodeURIComponent(paymentDocId)}&key=${encodeURIComponent(key)}`,
  contact: '/contact',
  page: (slug: string) => `/pages/${slug}`,
} as const;

/** An operator-authored link: same-site paths route in-app, anything else opens as a link. */
export function isInternalLink(link: string): boolean {
  return link.startsWith('/') && !link.startsWith('//');
}
