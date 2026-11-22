import { useState } from 'react';
import PhoneInTalkIcon from '@mui/icons-material/PhoneInTalk';
import { useTranslation } from '@duncit/shell';
import { fireAndForget, logs } from '@duncit/logs';
import FloatingWindow from './FloatingWindow';
import CallSetupPanel from './CallSetupPanel';
import LiveCallPanel from './LiveCallPanel';
import MinimizedCallBar from './MinimizedCallBar';
import CloseCallDialog from './CloseCallDialog';
import type { CallSession } from './useCallSession';

interface Props {
  session: CallSession;
  onClose: () => void;
}

/**
 * The advanced call window: setup before the call, then status, controls and
 * the live transcript. Closing it while the call is live asks first; the call
 * only ends on an explicit "End call and close", and the window only closes
 * once Twilio accepted that.
 */
export default function CallWindow({ session, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(false);
  const [ending, setEnding] = useState(false);

  const requestClose = () => {
    if (session.live) setConfirming(true);
    else onClose();
  };

  const endAndClose = async () => {
    setEnding(true);
    const ended = await session.control('END');
    setEnding(false);
    setConfirming(false);
    if (ended) onClose();
  };

  const placed = !!session.logId;

  return (
    <>
      <FloatingWindow
        title={t('crm.call.title', { vars: { name: session.lead?.displayName ?? '' } })}
        icon={<PhoneInTalkIcon fontSize="small" />}
        onCloseRequest={requestClose}
        minimized={<MinimizedCallBar session={session} />}
      >
        {placed ? <LiveCallPanel session={session} /> : <CallSetupPanel session={session} />}
      </FloatingWindow>
      <CloseCallDialog
        open={confirming}
        ending={ending}
        onContinue={() => setConfirming(false)}
        onEndAndClose={() => fireAndForget(endAndClose(), logs.portal.crm, 'CallWindow', 'endAndClose')}
      />
    </>
  );
}
