import ConsentBanner from './ConsentBanner';
import { useConsentSync } from './useConsentSync';

/** Everything the app shell mounts for tracking consent. */
export default function ConsentHost({ isAuthed }: Readonly<{ isAuthed: boolean }>) {
  useConsentSync(isAuthed);
  return <ConsentBanner />;
}
