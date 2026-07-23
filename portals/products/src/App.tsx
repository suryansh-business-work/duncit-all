import { Navigate, Route, Routes } from 'react-router-dom';
import { createAuthed, ProfilePage } from '@duncit/shell';
import { useFeatureFlag } from '@duncit/app-settings';
import LoginPage from './pages/LoginPage';
import WelcomePage from './pages/WelcomePage';
import InventoryPage from './pages/inventory-page/InventoryPage';
import InventoryProductPage from './pages/inventory-page/inventory-product-page/InventoryProductPage';
import EcommRequestsPage from './pages/ecomm/EcommRequestsPage';
import EcommMarketplacePage from './pages/ecomm/EcommMarketplacePage';
import EcommBrandDetailPage from './pages/ecomm/EcommBrandDetailPage';
import BrandRequestPage from './pages/ecomm/ecomm-requests/BrandRequestPage';
import ProductRequestPage from './pages/ecomm/ecomm-requests/ProductRequestPage';
import ProductOrdersPage from './pages/orders/ProductOrdersPage';
import ProductOrderDetailPage from './pages/orders/ProductOrderDetailPage';
import DuncitWarehousesPage from './pages/settings/DuncitWarehousesPage';
import AppShell from './components/AppShell';
import { getToken } from './lib/session';

/** Gates the product routes: when products are hidden they redirect home. */
function RequireProducts({ children }: Readonly<{ children: JSX.Element }>) {
  const showProducts = useFeatureFlag('is_product_visible');
  if (!showProducts) return <Navigate to="/" replace />;
  return children;
}

const authed = createAuthed({ getToken, wrap: (element) => <AppShell>{element}</AppShell> });

const products = (element: JSX.Element) => authed(<RequireProducts>{element}</RequireProducts>);

export default function App() {
  return (
    <Routes>
      <Route path="/profile" element={authed(<ProfilePage />)} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={authed(<WelcomePage />)} />
      <Route path="/inventory" element={products(<InventoryPage />)} />
      <Route path="/inventory/new" element={products(<InventoryProductPage />)} />
      <Route path="/inventory/:id/edit" element={products(<InventoryProductPage />)} />
      <Route path="/ecomm/product-requests" element={products(<EcommRequestsPage />)} />
      <Route path="/ecomm/brand-request" element={products(<BrandRequestPage />)} />
      <Route path="/ecomm/product-request" element={products(<ProductRequestPage />)} />
      <Route path="/ecomm/brands" element={products(<EcommMarketplacePage />)} />
      <Route path="/ecomm/brands/:brandId" element={products(<EcommBrandDetailPage />)} />
      <Route path="/orders" element={products(<ProductOrdersPage />)} />
      <Route path="/orders/:orderId" element={products(<ProductOrderDetailPage />)} />
      <Route path="/settings/warehouses" element={products(<DuncitWarehousesPage />)} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
