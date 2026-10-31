import { lazy, type ComponentType } from 'react';
import { matchRoutes, type RouteObject } from 'react-router';

import { AppShell } from './layout/AppShell';
import { STORE_PATHS } from './route-paths';

type PageComponent = ComponentType & { preload: () => Promise<unknown> };

/**
 * Route-level code splitting: each page's code loads the first time it is
 * visited. Once loaded, the page renders straight away instead of through
 * `lazy`, which suspends at least once — so preloading the page a
 * server-rendered address shows lets the browser hydrate it in one pass,
 * before any remembered setting changes what the page looks like.
 */
const page = <T extends Record<string, unknown>>(load: () => Promise<T>, name: keyof T): PageComponent => {
  let loaded: ComponentType | null = null;
  const preload = () =>
    load().then((module) => {
      loaded = module[name] as ComponentType;
      return loaded;
    });
  const Lazy = lazy(async () => ({ default: await preload() }));
  function Page() {
    const Loaded = loaded;
    return Loaded ? <Loaded /> : <Lazy />;
  }
  return Object.assign(Page, { preload });
};

const HomePage = page(() => import('../pages/home'), 'HomePage');
const ShopPage = page(() => import('../pages/shelf/ShelfPages'), 'ShopPage');
const SearchPage = page(() => import('../pages/shelf/ShelfPages'), 'SearchPage');
const DealsPage = page(() => import('../pages/deals'), 'DealsPage');
const PetTypePage = page(() => import('../pages/shelf/PetTypePage'), 'PetTypePage');
const CategoryPage = page(() => import('../pages/shelf/CategoryPage'), 'CategoryPage');
const CollectionPage = page(() => import('../pages/shelf/CollectionPage'), 'CollectionPage');
const BrandPage = page(() => import('../pages/shelf/ShelfPages'), 'BrandPage');
const BrandsPage = page(() => import('../pages/brands'), 'BrandsPage');
const ProductPage = page(() => import('../pages/product'), 'ProductPage');
const CartPage = page(() => import('../pages/cart'), 'CartPage');
const CheckoutPage = page(() => import('../pages/checkout'), 'CheckoutPage');
const OrderSuccessPage = page(() => import('../pages/order-success'), 'OrderSuccessPage');
const AccountPage = page(() => import('../pages/account/ProfilePage'), 'ProfilePage');
const OrdersPage = page(() => import('../pages/account/OrdersPage'), 'OrdersPage');
const AccountOrderPage = page(() => import('../pages/account/AccountOrderPage'), 'AccountOrderPage');
const AddressesPage = page(() => import('../pages/account/addresses'), 'AddressesPage');
const ReturnsPage = page(() => import('../pages/account/ReturnsPage'), 'ReturnsPage');
const PetProfilePage = page(() => import('../pages/account/pet-profile'), 'PetProfilePage');
const AutoshipPage = page(() => import('../pages/autoship'), 'AutoshipPage');
const WishlistPage = page(() => import('../pages/wishlist'), 'WishlistPage');
const TrackPage = page(() => import('../pages/track'), 'TrackPage');
const PolicyPage = page(() => import('../pages/info/PolicyPage'), 'PolicyPage');
const ContactPage = page(() => import('../pages/info/ContactPage'), 'ContactPage');
const NotFoundPage = page(() => import('../pages/info/NotFoundPage'), 'NotFoundPage');

interface PageHandle {
  preload: () => Promise<unknown>;
}

const pageRoute = (path: string, Page: PageComponent): RouteObject => ({
  path,
  element: <Page />,
  handle: { preload: Page.preload } satisfies PageHandle,
});

/** The route id of the catch-all, so the server can answer it with a 404. */
export const NOT_FOUND_ROUTE_ID = 'not-found';

/**
 * Every store page. The browser builds its router from these in main.tsx and
 * the server its static one in entry-server.tsx; building a browser router
 * here, at import, would touch `window` on the server.
 */
export const storeRoutes: RouteObject[] = [
  {
    element: <AppShell />,
    children: [
      pageRoute(STORE_PATHS.home, HomePage),
      pageRoute(STORE_PATHS.shop, ShopPage),
      pageRoute(STORE_PATHS.search, SearchPage),
      pageRoute(STORE_PATHS.deals, DealsPage),
      pageRoute(STORE_PATHS.petType, PetTypePage),
      pageRoute(STORE_PATHS.category, CategoryPage),
      pageRoute(STORE_PATHS.collection, CollectionPage),
      pageRoute(STORE_PATHS.brands, BrandsPage),
      pageRoute(STORE_PATHS.brand, BrandPage),
      pageRoute(STORE_PATHS.product, ProductPage),
      pageRoute(STORE_PATHS.cart, CartPage),
      pageRoute(STORE_PATHS.checkout, CheckoutPage),
      pageRoute(STORE_PATHS.orderSuccess, OrderSuccessPage),
      pageRoute(STORE_PATHS.account, AccountPage),
      pageRoute(STORE_PATHS.orders, OrdersPage),
      pageRoute(STORE_PATHS.order, AccountOrderPage),
      pageRoute(STORE_PATHS.addresses, AddressesPage),
      pageRoute(STORE_PATHS.returns, ReturnsPage),
      pageRoute(STORE_PATHS.petProfile, PetProfilePage),
      pageRoute(STORE_PATHS.autoship, AutoshipPage),
      pageRoute(STORE_PATHS.wishlist, WishlistPage),
      pageRoute(STORE_PATHS.track, TrackPage),
      pageRoute(STORE_PATHS.page, PolicyPage),
      pageRoute(STORE_PATHS.contact, ContactPage),
      { ...pageRoute('*', NotFoundPage), id: NOT_FOUND_ROUTE_ID },
    ],
  },
];

/** Load the code of the page at this address, so hydrating it never waits on a chunk. */
export async function preloadPage(pathname: string): Promise<void> {
  const matches = matchRoutes(storeRoutes, pathname) ?? [];
  await Promise.all(matches.map((match) => (match.route.handle as PageHandle | undefined)?.preload()));
}
