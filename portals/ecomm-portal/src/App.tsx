import type { ReactElement } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { createAuthed, ProfilePage } from '@duncit/shell';
import { runtime } from './runtime';
import DashboardPage from './pages/dashboard';
import OrdersPage from './pages/orders/OrdersPage';
import OrderDetailPage from './pages/orders/order-detail';
import ReturnsPage from './pages/returns/ReturnsPage';
import ReturnDetailPage from './pages/returns/return-detail';
import CustomersPage from './pages/customers/CustomersPage';
import CustomerDetailPage from './pages/customers/CustomerDetailPage';
import ProductsPage from './pages/products/ProductsPage';
import ListingPage from './pages/products/listing-page';
import PetTypesPage from './pages/pet-types/PetTypesPage';
import CategoriesPage from './pages/categories/CategoriesPage';
import FiltersPage from './pages/filters/FiltersPage';
import CollectionsPage from './pages/collections/CollectionsPage';
import CollectionEditorPage from './pages/collections/collection-editor';
import HomePageBuilder from './pages/home-page/HomePageBuilder';
import ReviewsPage from './pages/reviews/ReviewsPage';
import CouponsPage from './pages/coupons/CouponsPage';
import CartsPage from './pages/carts/CartsPage';
import StockAlertsPage from './pages/stock-alerts/StockAlertsPage';
import AutoshipPage from './pages/autoship/AutoshipPage';
import SettingsPage from './pages/settings/SettingsPage';

const authed = createAuthed({
  getToken: runtime.session.getToken,
  wrap: (el) => <runtime.AppShell>{el}</runtime.AppShell>,
});

/** Every signed-in route — exactly the sidebar's destinations plus their detail pages. */
const SIGNED_IN: ReadonlyArray<{ path: string; element: ReactElement }> = [
  { path: '/', element: <DashboardPage /> },
  { path: '/orders', element: <OrdersPage /> },
  { path: '/orders/:id', element: <OrderDetailPage /> },
  { path: '/returns', element: <ReturnsPage /> },
  { path: '/returns/:id', element: <ReturnDetailPage /> },
  { path: '/customers', element: <CustomersPage /> },
  { path: '/customers/:email', element: <CustomerDetailPage /> },
  { path: '/products', element: <ProductsPage /> },
  { path: '/products/:id', element: <ListingPage /> },
  { path: '/pet-types', element: <PetTypesPage /> },
  { path: '/categories', element: <CategoriesPage /> },
  { path: '/filters', element: <FiltersPage /> },
  { path: '/collections', element: <CollectionsPage /> },
  { path: '/collections/new', element: <CollectionEditorPage /> },
  { path: '/collections/:id', element: <CollectionEditorPage /> },
  { path: '/home-page', element: <HomePageBuilder /> },
  { path: '/reviews', element: <ReviewsPage /> },
  { path: '/coupons', element: <CouponsPage /> },
  { path: '/carts', element: <CartsPage /> },
  { path: '/stock-alerts', element: <StockAlertsPage /> },
  { path: '/autoship', element: <AutoshipPage /> },
  { path: '/settings', element: <SettingsPage /> },
  { path: '/profile', element: <ProfilePage /> },
];

/** The E-commerce console: the Duncit Pet Store's operators' side. */
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<runtime.LoginPage />} />
      {SIGNED_IN.map(({ path, element }) => (
        <Route key={path} path={path} element={authed(element)} />
      ))}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
