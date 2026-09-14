import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useUserData } from '@duncit/user-context';
import MenuPanel from '../../components/app-header/profile-drawer/MenuPanel';
import { useUserInfo } from '../../user-info/useUserInfo';

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
  // The account, its balance and the policy links all came in with the session
  // load (USER_INFO), so opening the menu asks the server for nothing. A
  // profile save re-reads USER_INFO, which is what keeps this current.
  const { me, policies, loading } = useUserInfo();

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
      loading={loading}
      policiesLoading={loading}
      me={me}
      publicPolicies={policies}
      policiesOpen={policiesOpen}
      setPoliciesOpen={setPoliciesOpen}
      onLogout={logout}
    />
  );
}
