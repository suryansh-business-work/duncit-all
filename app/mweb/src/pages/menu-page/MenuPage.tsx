import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { useNavigate } from 'react-router-dom';
import { useUserData } from '@duncit/user-context';
import MenuPanel from '../../components/app-header/profile-drawer/MenuPanel';
import { HEADER_DATA, PUBLIC_POLICIES } from '../../components/app-header/queries';

/**
 * The account menu as a real page (/menu) — it used to be a full-viewport
 * drawer mounted in the header. As a route it survives a refresh, can be
 * linked to, and the browser Back button behaves like everywhere else; the ✕
 * simply returns to the page the user opened it from.
 */
export default function MenuPage() {
  const navigate = useNavigate();
  const { logout } = useUserData();
  const [policiesOpen, setPoliciesOpen] = useState(false);
  // Both are already in the cache from the header — cache-and-network keeps the
  // menu fresh after a profile edit without blocking the first paint.
  const { data, loading } = useQuery<any>(HEADER_DATA, { fetchPolicy: 'cache-and-network' });
  const { data: policiesData, loading: policiesLoading } = useQuery<any>(PUBLIC_POLICIES, {
    fetchPolicy: 'cache-first',
  });

  // Nothing cached at all — the panel skeletons its body. On a warm cache the
  // answer is already there, so the read still happening shows as the thin bar
  // instead of flashing a skeleton over content that is already correct.
  const pending = loading && !data;
  const refreshing = !pending && (loading || policiesLoading);

  const close = () => {
    // A deep-linked /menu has nothing to go back to — land on Home instead of
    // leaving the app.
    const idx = Number((globalThis.history.state as { idx?: number })?.idx ?? 0);
    if (idx > 0) {
      navigate(-1);
      return;
    }
    navigate('/', { replace: true });
  };

  // On a refresh or a deep link the cache is empty, and rendering `me` as
  // undefined would paint a stranger's menu for a beat — an anonymous "User"
  // avatar at 0% profile completion. The panel skeletons its body instead of
  // the page swapping to a bare spinner, so the ✕ is there to leave with.
  return (
    <MenuPanel
      onClose={close}
      loading={pending}
      refreshing={refreshing}
      policiesLoading={policiesLoading}
      me={data?.me}
      publicPolicies={policiesData?.publicPolicies ?? []}
      policiesOpen={policiesOpen}
      setPoliciesOpen={setPoliciesOpen}
      onLogout={logout}
    />
  );
}
