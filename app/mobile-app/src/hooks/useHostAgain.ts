import { useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { logs } from '@duncit/logs';

import { HostAgainPodDocument } from '@/graphql/create-pod';
import type { RootStackParamList } from '@/navigation/types';
import { graphqlRequest } from '@/services/graphql.client';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * "Host again" for one pod — the native twin of `@duncit/host-pod-actions`'
 * `useHostAgain` (rule 27): the server copies the pod's content into a new
 * draft and Create Pod opens on it. A second tap while the copy is still being
 * made is ignored, so a double tap never leaves two identical drafts.
 */
export function useHostAgain() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { t } = useTranslation();
  const [notice, setNotice] = useState<string | null>(null);
  const busy = useRef(false);

  const hostAgain = (podId: string) => {
    if (busy.current) return;
    busy.current = true;
    setNotice(null);
    graphqlRequest(HostAgainPodDocument, { pod_doc_id: podId }, { auth: true })
      .then((res) => navigation.navigate('CreatePod', { draftId: res.hostAgainPod.id }))
      .catch((error: unknown) => {
        logs.mobileApp.error('useHostAgain', 'hostAgainPod', { error });
        setNotice(t('mweb.hostPodActions.hostAgainFailed'));
      })
      .finally(() => {
        busy.current = false;
      });
  };

  return { hostAgain, notice };
}
