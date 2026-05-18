import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import PartnerHomePage from './pages/PartnerHomePage';
import RegisterVenuePage from './pages/RegisterVenuePage';
import BecomeHostPage from './pages/become-host-page/BecomeHostPage';
import PartnerShell from './components/PartnerShell';
import { redirectPathFromLocation } from './utils/redirect';

function RequireAuth({ children }: { children: JSX.Element }) {
  const location = useLocation();
  const token = localStorage.getItem('token');
  if (!token) {
    const redirect = encodeURIComponent(redirectPathFromLocation(location));
    return <Navigate to={`/login?redirect=${redirect}`} replace state={{ from: location }} />;
  }
  return children;
}

const authed = (element: JSX.Element) => (
  <RequireAuth>
    <PartnerShell>{element}</PartnerShell>
  </RequireAuth>
);

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={authed(<PartnerHomePage />)} />
      <Route path="/register-venue" element={authed(<RegisterVenuePage />)} />
      <Route path="/become-host" element={authed(<BecomeHostPage />)} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}