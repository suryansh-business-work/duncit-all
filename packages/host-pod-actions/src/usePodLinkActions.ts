import { copyToClipboard, podFeedbackLink, podMediaLink } from '@duncit/utils';
import { useHostPodActionsConfig } from './HostPodActionsProvider';

interface LinkPod {
  id: string;
  pod_title: string;
}

export interface HostPodLinkActions {
  open: (pod: LinkPod) => void;
  share: (pod: LinkPod) => Promise<void>;
  copy: (pod: LinkPod) => Promise<void>;
}

/** Which of the host's two per-pod links is being handed out. */
export type HostPodLinkKind = 'POD_FEEDBACK' | 'POD_MEDIA';

/**
 * The three things a host does with a pod's link: open it, send it, or copy it.
 *
 * Two links behave identically — the rating form and the media upload page —
 * so they are ONE implementation parameterised by which (rule 40). Both are
 * built from the base the surface supplies, so a link opened on a local build
 * stays local instead of pointing at production, and a portal with neither page
 * of its own points at mWeb's.
 */
function usePodLinkActions(kind: HostPodLinkKind): HostPodLinkActions {
  const {
    labels,
    podMediaLabels,
    linkBaseUrl,
    onOpenFeedback,
    onOpenPodMedia,
    resolveShareUrl,
    notifySuccess,
    notifyError,
  } = useHostPodActionsConfig();

  const feedback = kind === 'POD_FEEDBACK';
  const linkFor = (pod: LinkPod) =>
    feedback ? podFeedbackLink(pod.id, linkBaseUrl) : podMediaLink(pod.id, linkBaseUrl);
  const messageFor = (title: string) =>
    feedback ? labels.shareMessage(title) : podMediaLabels.shareMessage(title);

  /** What the host actually hands out: the tracked short link where the surface
   * can mint one, so a guest arriving from a sent link is counted like every
   * other share. Share and Copy resolve the SAME link — one pod, one address. */
  const sharedLinkFor = async (pod: LinkPod) => {
    const plain = linkFor(pod);
    return resolveShareUrl ? resolveShareUrl(kind, pod.id, plain) : plain;
  };

  const copyText = async (text: string) => {
    const copied = await copyToClipboard(text);
    // A clipboard that refused (insecure origin, unfocused document) must not
    // toast "copied" for something the host will paste and find missing.
    if (copied) notifySuccess(labels.linkCopied);
    else notifyError(labels.copyFailed);
  };

  const share = async (pod: LinkPod) => {
    const message = `${messageFor(pod.pod_title)}\n${await sharedLinkFor(pod)}`;
    // No share sheet on this browser — copy the whole message instead, so the
    // host still pastes the ask and not a naked URL.
    if (!navigator.share) {
      await copyText(message);
      return;
    }
    try {
      // The link rides the LAST LINE of `text` and never a `url` field: targets
      // that accept `url` drop `text`, which would send a bare link with the
      // sentence that makes someone tap it stripped off.
      await navigator.share({ title: pod.pod_title, text: message });
    } catch {
      // user dismissed the native share sheet — nothing to report
    }
  };

  return {
    open: (pod: LinkPod) => (feedback ? onOpenFeedback(pod.id) : onOpenPodMedia?.(pod.id)),
    share,
    // The button says "copy link", so it copies the link — the host is pasting
    // it somewhere that already has their own words around it.
    copy: async (pod: LinkPod) => copyText(await sharedLinkFor(pod)),
  };
}

/** The pod's rating form: open it, send it, copy it. */
export const useHostFeedbackLink = (): HostPodLinkActions => usePodLinkActions('POD_FEEDBACK');

/** The pod's media upload page — the same three actions, the same one link. */
export const useHostPodMediaLink = (): HostPodLinkActions => usePodLinkActions('POD_MEDIA');
