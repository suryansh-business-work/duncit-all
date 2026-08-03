import { Sidebar } from '@/components/Sidebar';
import { useGoBack } from '@/hooks/useGoBack';

/**
 * The account menu as a routable screen (URL /menu) — the native twin of mWeb's
 * /menu page. It is a normal pushed screen (it used to be a translucent modal
 * drawer), so hardware Back, a deep link and a page refresh all behave like any
 * other route; the ✕ in its header goes back.
 */
export function MenuScreen() {
  const goBack = useGoBack();
  return <Sidebar onClose={goBack} />;
}
