import type { JSX } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { createAuthed, ProfilePage } from '@duncit/shell';
import { useProductVisibility } from '@duncit/app-settings';
import LoginPage from './pages/LoginPage';
import WelcomePage from './pages/WelcomePage';
import InventoryPage from './pages/inventory-page/InventoryPage';
import InventoryProductPage from './pages/inventory-page/inventory-product-page/InventoryProductPage';
import ProductsReviewPage from './pages/ecomm/ProductsReviewPage';
import BrandsReviewPage from './pages/ecomm/BrandsReviewPage';
import BrandReviewDetailPage from './pages/ecomm/BrandReviewDetailPage';
import CatalogBrandsPage from './pages/catalog-brands/CatalogBrandsPage';
import CatalogBrandDetailPage from './pages/catalog-brands/CatalogBrandDetailPage';
import CatalogBrandProductsPage from './pages/catalog-brands/CatalogBrandProductsPage';
import BrandRequestPage from './pages/ecomm/ecomm-requests/BrandRequestPage';
import ProductRequestPage from './pages/ecomm/ecomm-requests/ProductRequestPage';
import ProductOrdersPage from './pages/orders/ProductOrdersPage';
import ProductOrderDetailPage from './pages/orders/ProductOrderDetailPage';
import WarehouseApprovalPage from './pages/warehouse-approval';
import DuncitWarehousesPage from './pages/settings/DuncitWarehousesPage';
import PodShopSliderPage from './pages/settings/PodShopSliderPage';
import AppShell from './components/AppShell';
import { getToken } from './lib/session';

/**
 * Gates the product routes: when products are hidden they redirect home.
 *
 * It waits on `pending` — the flag set lands a beat after the first paint, and
 * redirecting on that beat sends every bookmarked /inventory link to the
 * dashboard even with the feature switched on.
 */
function RequireProducts({ children }: Readonly<{ children: JSX.Element }>) {
  const { pending, visible } = useProductVisibility();
  if (pending) return null;
  if (!visible) return <Navigate to="/" replace />;
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
      <Route path="/catalog/brands" element={products(<CatalogBrandsPage />)} />
      <Route path="/catalog/brands/:brandId" element={products(<CatalogBrandDetailPage />)} />
      <Route
        path="/catalog/brands/:brandId/products"
        element={products(<CatalogBrandProductsPage />)}
      />
      <Route
        path="/catalog/brands/:brandId/products/:id/edit"
        element={products(<InventoryProductPage />)}
      />
      <Route path="/ecomm/product-requests" element={products(<ProductsReviewPage />)} />
      <Route path="/ecomm/brand-request" element={products(<BrandRequestPage />)} />
      <Route path="/ecomm/product-request" element={products(<ProductRequestPage />)} />
      <Route path="/ecomm/brands" element={products(<BrandsReviewPage />)} />
      <Route path="/ecomm/brands/:brandId" element={products(<BrandReviewDetailPage />)} />
      <Route path="/warehouse-approval" element={products(<WarehouseApprovalPage />)} />
      <Route path="/orders" element={products(<ProductOrdersPage />)} />
      <Route path="/orders/:orderId" element={products(<ProductOrderDetailPage />)} />
      <Route path="/settings/warehouses" element={products(<DuncitWarehousesPage />)} />
      <Route path="/settings/pod-shop-slider" element={products(<PodShopSliderPage />)} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
