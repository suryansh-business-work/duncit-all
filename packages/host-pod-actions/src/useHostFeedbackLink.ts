import { copyToClipboard, podFeedbackLink } from '@duncit/utils';
import { useHostPodActionsConfig } from './HostPodActionsProvider';

interface FeedbackPod {
  id: string;
  pod_title: string;
}

export interface HostFeedbackLinkActions {
  open: (pod: FeedbackPod) => void;
  share: (pod: FeedbackPod) => Promise<void>;
  copy: (pod: FeedbackPod) => Promise<void>;
}

/**
 * The three things a host does with a pod's rating link: open it, send it, or
 * copy it.
 *
 * The URL is built from the base the surface supplies, so a link opened on a
 * local build stays local instead of pointing at production — and a portal,
 * which has no rating page of its own, points at mWeb's.
 */
export function useHostFeedbackLink(): HostFeedbackLinkActions {
  const {
    labels,
    feedbackBaseUrl,
    onOpenFeedback,
    resolveShareUrl,
    notifySuccess,
    notifyError,
  } = useHostPodActionsConfig();

  const linkFor = (pod: FeedbackPod) => podFeedbackLink(pod.id, feedbackBaseUrl);

  /** What the host actually hands out: the tracked short link where the surface
   * can mint one, so ratings arriving from a sent link are counted like every
   * other share. */
  const sharedLinkFor = async (pod: FeedbackPod) => {
    const plain = linkFor(pod);
    return resolveShareUrl ? resolveShareUrl(pod.id, plain) : plain;
  };

  const messageFor = async (pod: FeedbackPod) =>
    `${labels.shareMessage(pod.pod_title)}\n${await sharedLinkFor(pod)}`;

  const copyText = async (text: string) => {
    const copied = await copyToClipboard(text);
    // A clipboard that refused (insecure origin, unfocused document) must not
    // toast "copied" for something the host will paste and find missing.
    if (copied) notifySuccess(labels.linkCopied);
    else notifyError(labels.copyFailed);
  };

  const share = async (pod: FeedbackPod) => {
    const message = await messageFor(pod);
    // No share sheet on this browser — copy the whole message instead, so the
    // host still pastes the question and not a naked URL.
    if (!navigator.share) {
      await copyText(message);
      return;
    }
    try {
      // The link rides the LAST LINE of `text` and never a `url` field: targets
      // that accept `url` drop `text`, which would send a bare link with the
      // question that makes someone tap it stripped off.
      await navigator.share({ title: pod.pod_title, text: message });
    } catch {
      // user dismissed the native share sheet — nothing to report
    }
  };

  return {
    open: (pod: FeedbackPod) => onOpenFeedback(pod.id),
    share,
    // The button says "copy link", so it copies the link — the host is pasting
    // it somewhere that already has their own words around it.
    copy: async (pod: FeedbackPod) => copyText(await sharedLinkFor(pod)),
  };
}
