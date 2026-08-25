import { useCallback, useState } from 'react';
import { Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { podFeedbackLink, podMediaLink } from '@duncit/utils';

import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';
import { shareUrl } from '@/services/share-link';
import { POD_WEB_BASE } from '@/utils/pod-format';

/** How long the "copied" line stays up before it stops being news. */
const NOTICE_MS = 3000;

interface FeedbackPod {
  id: string;
  pod_title: string;
}

/** Which of the host's two per-pod links is being handed out. */
type LinkKind = 'POD_FEEDBACK' | 'POD_MEDIA';

/**
 * The three things a host does with one of a pod's links: open it, send it, or
 * copy it. The RN twin of mWeb's usePodLinkActions (rule 27) — the URL comes
 * from this build's web origin, so a local build shares a local link.
 *
 * Two links behave identically — the rating form and the media upload page —
 * so they are ONE implementation parameterised by which (rule 40), and Share
 * and Copy resolve the SAME address for a given pod.
 */
function usePodLinkActions(kind: LinkKind) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { t } = useTranslation();
  const [notice, setNotice] = useState<string | null>(null);

  const feedback = kind === 'POD_FEEDBACK';
  const linkFor = useCallback(
    (pod: FeedbackPod) =>
      feedback ? podFeedbackLink(pod.id, POD_WEB_BASE) : podMediaLink(pod.id, POD_WEB_BASE),
    [feedback],
  );

  /** What the host actually hands out: the tracked short link, so ratings that
   * arrive from a sent link are counted (mWeb's twin does the same). */
  const sharedLinkFor = useCallback(
    (pod: FeedbackPod) => shareUrl(kind, pod.id, linkFor(pod)),
    [kind, linkFor],
  );

  const messageFor = useCallback(
    async (pod: FeedbackPod) => {
      const ask = feedback
        ? t('mweb.podFeedback.shareMessage', { vars: { title: pod.pod_title } })
        : t('mweb.podMedia.shareMessage', { vars: { title: pod.pod_title } });
      return `${ask}\n${await sharedLinkFor(pod)}`;
    },
    [feedback, sharedLinkFor, t],
  );

  const open = useCallback(
    (pod: FeedbackPod) =>
      feedback
        ? navigation.navigate('PodFeedback', { podId: pod.id })
        : navigation.navigate('PodMedia', { podId: pod.id }),
    [feedback, navigation],
  );

  const share = useCallback(
    // No `url` field, exactly as PodDetailsScreen shares a pod: iOS repeats a
    // link given both ways, and the link is already the last line here.
    async (pod: FeedbackPod) =>
      Share.share({ title: pod.pod_title, message: await messageFor(pod) }),
    [messageFor],
  );

  // The button says "copy link", so it copies the link — the host is pasting it
  // somewhere that already has their own words around it.
  const copy = useCallback(
    async (pod: FeedbackPod) => {
      await Clipboard.setStringAsync(await sharedLinkFor(pod));
      // The sheet has closed by now, so without this the host has no way of
      // knowing the copy landed.
      setNotice(
        feedback ? t('mweb.podFeedback.linkCopied') : t('mweb.podMedia.linkCopied'),
      );
      globalThis.setTimeout(() => setNotice(null), NOTICE_MS);
    },
    [feedback, sharedLinkFor, t],
  );

  return { open, share, copy, notice };
}

/** The pod's rating form: open it, send it, copy it. */
export const useFeedbackLinkActions = () => usePodLinkActions('POD_FEEDBACK');

/** The pod's media upload page — the same three actions, the same one link. */
export const usePodMediaLinkActions = () => usePodLinkActions('POD_MEDIA');
