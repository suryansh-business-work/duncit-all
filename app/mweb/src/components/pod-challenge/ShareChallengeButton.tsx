import ShareIcon from '@mui/icons-material/Share';
import { DuncitButton } from '@duncit/buttons';
import { fireAndForget, logs } from '@duncit/logs';
import { podChallengeLiveLink } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import { notifyError, notifySuccess } from '../notify';

interface Props {
  podId: string;
  challengeId: string;
  name: string;
}

/**
 * Shares the challenge's live/result page. The link carries no authority:
 * whoever opens it sees only what the server lets them see.
 */
export default function ShareChallengeButton({ podId, challengeId, name }: Readonly<Props>) {
  const { t } = useTranslation();
  const url = podChallengeLiveLink(podId, challengeId, globalThis.location.origin);

  const share = async () => {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: name, url });
        return;
      } catch (error) {
        // The person closed the share sheet: not a failure worth reporting.
        if ((error as { name?: string }).name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      notifySuccess(t('mweb.challenge.linkCopied'));
    } catch (error) {
      logs.mWeb.warn('pod-challenge', 'share', { error });
      notifyError(t('mweb.challenge.linkCopyFailed'));
    }
  };

  return (
    <DuncitButton size="small" startIcon={<ShareIcon />} onClick={() => fireAndForget(share(), logs.mWeb, 'pod-challenge', 'share')}>
      {t('mweb.challenge.share')}
    </DuncitButton>
  );
}
