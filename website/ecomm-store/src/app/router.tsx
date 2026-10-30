import { lazy, type ComponentType } from 'react';
import { createBrowserRouter } from 'react-router';

import { AppShell } from './layout/AppShell';
import { STORE_PATHS } from './route-paths';

/** Route-level code splitting: each page's code loads the first time it is visited. */
const page = <T extends Record<string, unknown>>(load: () => Promise<T>, name: keyof T) =>
  lazy(async () => ({ default: (await load())[name] as ComponentType }));

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

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: STORE_PATHS.home, element: <HomePage /> },
      { path: STORE_PATHS.shop, element: <ShopPage /> },
      { path: STORE_PATHS.search, element: <SearchPage /> },
      { path: STORE_PATHS.deals, element: <DealsPage /> },
      { path: STORE_PATHS.petType, element: <PetTypePage /> },
      { path: STORE_PATHS.category, element: <CategoryPage /> },
      { path: STORE_PATHS.collection, element: <CollectionPage /> },
      { path: STORE_PATHS.brands, element: <BrandsPage /> },
      { path: STORE_PATHS.brand, element: <BrandPage /> },
      { path: STORE_PATHS.product, element: <ProductPage /> },
      { path: STORE_PATHS.cart, element: <CartPage /> },
      { path: STORE_PATHS.checkout, element: <CheckoutPage /> },
      { path: STORE_PATHS.orderSuccess, element: <OrderSuccessPage /> },
      { path: STORE_PATHS.account, element: <AccountPage /> },
      { path: STORE_PATHS.orders, element: <OrdersPage /> },
      { path: STORE_PATHS.order, element: <AccountOrderPage /> },
      { path: STORE_PATHS.addresses, element: <AddressesPage /> },
      { path: STORE_PATHS.returns, element: <ReturnsPage /> },
      { path: STORE_PATHS.petProfile, element: <PetProfilePage /> },
      { path: STORE_PATHS.autoship, element: <AutoshipPage /> },
      { path: STORE_PATHS.wishlist, element: <WishlistPage /> },
      { path: STORE_PATHS.track, element: <TrackPage /> },
      { path: STORE_PATHS.page, element: <PolicyPage /> },
      { path: STORE_PATHS.contact, element: <ContactPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
