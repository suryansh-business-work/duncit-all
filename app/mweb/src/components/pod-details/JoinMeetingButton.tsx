import { useState } from 'react';
import VideocamIcon from '@mui/icons-material/Videocam';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';
import { notifyError } from '../notify';

interface Props {
  /** Asks the server for the link. Resolves with the URL to open, or throws. */
  onJoin: () => Promise<string>;
}

/**
 * "Join meeting" is a mutation, not a link.
 *
 * For a joined member inside the pod window, asking for the link is the mark
 * that pays the host — so the button never hrefs `pod.meeting_url` straight;
 * it opens whatever the server hands back once the call has landed.
 */
export default function JoinMeetingButton({ onJoin }: Readonly<Props>) {
  const { t } = useTranslation();
  const [pending, setPending] = useState(false);

  const handleClick = async () => {
    setPending(true);
    try {
      const url = await onJoin();
      globalThis.open(url, '_blank', 'noopener');
    } catch {
      notifyError(t('mweb.podDetails.joinMeetingFailed'));
    } finally {
      setPending(false);
    }
  };

  const label = pending ? t('mweb.podDetails.joiningMeeting') : t('mweb.podDetails.joinMeeting');

  return (
    <DuncitButton
      variant="contained"
      startIcon={<VideocamIcon />}
      onClick={handleClick}
      disabled={pending}
      sx={{ alignSelf: 'flex-start' }}
    >
      {label}
    </DuncitButton>
  );
}
