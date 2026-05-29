import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import WelcomePage from './pages/WelcomePage';
import InventoryPage from './pages/inventory-page/InventoryPage';
import InventoryProductPage from './pages/inventory-page/inventory-product-page/InventoryProductPage';
import EcommRequestsPage from './pages/ecomm/EcommRequestsPage';
import AppShell from './components/AppShell';
import { getToken } from './lib/session';
import { redirectPathFromLocation } from './utils/redirect';

function RequireAuth({ children }: { children: JSX.Element }) {
  const location = useLocation();
  if (!getToken()) {
    const redirect = encodeURIComponent(redirectPathFromLocation(location));
    return <Navigate to={`/login?redirect=${redirect}`} replace state={{ from: location }} />;
  }
  return children;
}

const authed = (element: JSX.Element) => (
  <RequireAuth>
    <AppShell>{element}</AppShell>
  </RequireAuth>
);

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={authed(<WelcomePage />)} />
      <Route path="/inventory" element={authed(<InventoryPage />)} />
      <Route path="/inventory/new" element={authed(<InventoryProductPage />)} />
      <Route path="/inventory/:id/edit" element={authed(<InventoryProductPage />)} />
      <Route path="/ecomm/product-requests" element={authed(<EcommRequestsPage />)} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
