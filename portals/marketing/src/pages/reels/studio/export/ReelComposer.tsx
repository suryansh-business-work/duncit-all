import ComposerDialog, { type ComposerRequest } from '../../../social-accounts-page/publish/ComposerDialog';
import { useSocialSetup } from '../../../social-accounts-page/useSocialSetup';

interface Props {
  request: ComposerRequest;
  onClose: () => void;
}

/**
 * The social composer, opened from the studio on a reel that was just uploaded.
 *
 * It is the calendar's own composer with the calendar's own account list, so a
 * reel is posted exactly as any other post is — same networks, same rules, same
 * approval. Mounted only while a request is open, so the accounts are read when
 * a reel is about to be posted and not on every visit to the studio.
 */
export default function ReelComposer({ request, onClose }: Readonly<Props>) {
  const { accounts } = useSocialSetup();
  return <ComposerDialog request={request} accounts={accounts} onClose={onClose} />;
}
