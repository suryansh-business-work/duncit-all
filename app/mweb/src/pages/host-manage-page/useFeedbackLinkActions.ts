import { useNavigate } from 'react-router-dom';
import { copyToClipboard, podFeedbackLink, podFeedbackPath } from '@duncit/utils';
import { notifyError, notifySuccess } from '../../components/notify';
import { useTranslation } from '../../i18n/useTranslation';

interface FeedbackPod {
  id: string;
  pod_title: string;
}

/**
 * The three things a host does with a pod's rating link: open it, send it, or
 * copy it. The URL is built once here from this origin, so a link opened on a
 * local build stays local instead of pointing at production.
 */
export function useFeedbackLinkActions() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const linkFor = (pod: FeedbackPod) =>
    podFeedbackLink(pod.id, globalThis.window.location.origin);

  const messageFor = (pod: FeedbackPod) =>
    `${t('mweb.podFeedback.shareMessage', { vars: { title: pod.pod_title } })}\n${linkFor(pod)}`;

  const copyText = async (text: string) => {
    const copied = await copyToClipboard(text);
    // A clipboard that refused (insecure origin, unfocused document) must not
    // toast "copied" for something the host will paste and find missing.
    if (copied) notifySuccess(t('mweb.podFeedback.linkCopied'));
    else notifyError(t('mweb.podFeedback.copyFailed'));
  };

  const share = async (pod: FeedbackPod) => {
    // No share sheet on this browser — copy the whole message instead, so the
    // host still pastes the question and not a naked URL.
    if (!navigator.share) {
      await copyText(messageFor(pod));
      return;
    }
    try {
      // The link rides the LAST LINE of `text` and never a `url` field: targets
      // that accept `url` drop `text`, which would send a bare link with the
      // question that makes someone tap it stripped off.
      await navigator.share({ title: pod.pod_title, text: messageFor(pod) });
    } catch {
      // user dismissed the native share sheet — nothing to report
    }
  };

  return {
    open: (pod: FeedbackPod) => navigate(podFeedbackPath(pod.id)),
    share,
    // The button says "copy link", so it copies the link — the host is pasting
    // it somewhere that already has their own words around it.
    copy: (pod: FeedbackPod) => copyText(linkFor(pod)),
  };
}
