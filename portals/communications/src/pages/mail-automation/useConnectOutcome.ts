import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { notify } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';

/**
 * How the Gmail round trip reports itself.
 *
 * The OAuth callback is a browser navigation, so its only channel back is the
 * query string. This reads it once, says the right thing, and clears the
 * parameters so a refresh does not replay the message.
 *
 * A FAILED connect is HELD rather than toasted. It writes no row and leaves no
 * trace anywhere an operator can look, so a toast that disappears after a few
 * seconds — or is missed entirely while the page is still booting — means the
 * only account of what went wrong is gone, and the screen just says "no mailbox
 * connected" with no reason. Same for a re-connect: that one is a warning, not
 * a tick, because the operator will want to know their rule survived.
 */
export function useConnectOutcome(onConnected: () => void) {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const [connectError, setConnectError] = useState('');
  const [reconnectWarning, setReconnectWarning] = useState('');

  const connected = params.get('connected');
  const failure = params.get('error');
  const reconnected = params.get('reconnected') === '1';

  useEffect(() => {
    if (!connected && !failure) return;
    if (connected && reconnected) {
      setReconnectWarning(connected);
    } else if (connected) {
      notify(t('tech.mailAutomation.connected', { vars: { email: connected } }), 'success');
    } else if (failure === 'access_denied') {
      notify(t('tech.mailAutomation.cancelled'), 'info');
    } else {
      setConnectError(failure ?? '');
    }
    if (connected) onConnected();
    setParams({}, { replace: true });
    // A one-shot read of the landing URL. `onConnected`/`setParams`/`t` are
    // stable enough here; including them re-runs the effect and re-notifies on
    // every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, failure, reconnected]);

  return { connectError, setConnectError, reconnectWarning, setReconnectWarning };
}
