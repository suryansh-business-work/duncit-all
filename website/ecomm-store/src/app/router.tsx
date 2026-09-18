import { lazy, type ComponentType } from 'react';
import { createBrowserRouter } from 'react-router';

import { AppShell } from './layout/AppShell';

/** Route-level code splitting: each page's code loads the first time it is visited. */
const page = <T extends Record<string, unknown>>(load: () => Promise<T>, name: keyof T) =>
  lazy(async () => ({ default: (await load())[name] as ComponentType }));

const HomePage = page(() => import('../pages/home'), 'HomePage');
const ShopPage = page(() => import('../pages/shelf/ShelfPages'), 'ShopPage');
const SearchPage = page(() => import('../pages/shelf/ShelfPages'), 'SearchPage');
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
      { path: '/', element: <HomePage /> },
      { path: '/shop', element: <ShopPage /> },
      { path: '/search', element: <SearchPage /> },
      { path: '/pet/:slug', element: <PetTypePage /> },
      { path: '/c/:slug', element: <CategoryPage /> },
      { path: '/collections/:slug', element: <CollectionPage /> },
      { path: '/brands', element: <BrandsPage /> },
      { path: '/brand/:id', element: <BrandPage /> },
      { path: '/p/:slug', element: <ProductPage /> },
      { path: '/cart', element: <CartPage /> },
      { path: '/checkout', element: <CheckoutPage /> },
      { path: '/order/success', element: <OrderSuccessPage /> },
      { path: '/account', element: <AccountPage /> },
      { path: '/account/orders', element: <OrdersPage /> },
      { path: '/account/orders/:orderNo', element: <AccountOrderPage /> },
      { path: '/account/addresses', element: <AddressesPage /> },
      { path: '/account/returns', element: <ReturnsPage /> },
      { path: '/account/pet', element: <PetProfilePage /> },
      { path: '/autoship', element: <AutoshipPage /> },
      { path: '/wishlist', element: <WishlistPage /> },
      { path: '/track', element: <TrackPage /> },
      { path: '/pages/:slug', element: <PolicyPage /> },
      { path: '/contact', element: <ContactPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
