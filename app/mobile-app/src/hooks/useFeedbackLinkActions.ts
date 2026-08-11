import { useCallback, useState } from 'react';
import { Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { podFeedbackLink } from '@duncit/utils';

import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';
import { POD_WEB_BASE } from '@/utils/pod-format';

/** How long the "copied" line stays up before it stops being news. */
const NOTICE_MS = 3000;

interface FeedbackPod {
  id: string;
  pod_title: string;
}

/**
 * The three things a host does with a pod's rating link: open it, send it, or
 * copy it. The RN twin of mWeb's useFeedbackLinkActions (rule 27) — the URL
 * comes from this build's web origin, so a local build shares a local link.
 */
export function useFeedbackLinkActions() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { t } = useTranslation();
  const [notice, setNotice] = useState<string | null>(null);

  const linkFor = useCallback((pod: FeedbackPod) => podFeedbackLink(pod.id, POD_WEB_BASE), []);

  const messageFor = useCallback(
    (pod: FeedbackPod) =>
      `${t('mweb.podFeedback.shareMessage', { vars: { title: pod.pod_title } })}\n${linkFor(pod)}`,
    [linkFor, t],
  );

  const open = useCallback(
    (pod: FeedbackPod) => navigation.navigate('PodFeedback', { podId: pod.id }),
    [navigation],
  );

  const share = useCallback(
    // No `url` field, exactly as PodDetailsScreen shares a pod: iOS repeats a
    // link given both ways, and the link is already the last line here.
    (pod: FeedbackPod) => Share.share({ title: pod.pod_title, message: messageFor(pod) }),
    [messageFor],
  );

  // The button says "copy link", so it copies the link — the host is pasting it
  // somewhere that already has their own words around it.
  const copy = useCallback(
    async (pod: FeedbackPod) => {
      await Clipboard.setStringAsync(linkFor(pod));
      // The sheet has closed by now, so without this the host has no way of
      // knowing the copy landed.
      setNotice(t('mweb.podFeedback.linkCopied'));
      globalThis.setTimeout(() => setNotice(null), NOTICE_MS);
    },
    [linkFor, t],
  );

  return { open, share, copy, notice };
}
