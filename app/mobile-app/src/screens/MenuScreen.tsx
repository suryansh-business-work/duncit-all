import { Sidebar } from '@/components/Sidebar';
import { useGoBack } from '@/hooks/useGoBack';

/**
 * The account drawer as a routable screen (URL /menu) — the native twin of
 * mWeb's `?menu=open`. Registered as a transparentModal so the screen behind
 * stays visible under the drawer's translucent backdrop; browser/hardware Back
 * and a page refresh open/close it because it is a real route.
 */
export function MenuScreen() {
  const goBack = useGoBack();
  return <Sidebar open onClose={goBack} />;
}
