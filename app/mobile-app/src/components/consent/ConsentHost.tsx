import { useConsentSync } from '@/hooks/useConsentSync';
import { useAuthStore } from '@/stores/auth.store';
import { ConsentSheet } from './ConsentSheet';

/** Everything the app root mounts for tracking consent. Twin of mWeb's ConsentHost. */
export function ConsentHost() {
  const isAuthed = useAuthStore((s) => Boolean(s.token));
  useConsentSync(isAuthed);
  return <ConsentSheet />;
}
