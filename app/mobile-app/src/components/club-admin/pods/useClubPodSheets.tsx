import { useState, type ReactNode } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ClubAdminDeletePodDocument } from '@/graphql/club-admin';
import type { ClubAdminPodRow } from '@/hooks/useClubAdminPods';
import { useDetailNav } from '@/hooks/useDetailNav';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';
import { graphqlRequest } from '@/services/graphql.client';
import { fireAndForget } from '@/utils/fire-and-forget';
import { ClubPodActionsSheet } from './ClubPodActionsSheet';
import { ClubPodActivitySheet } from './ClubPodActivitySheet';

interface Options {
  clubId: string;
  /** Re-reads the list after a pod is deleted. */
  refetch: () => void;
  onDeleted: () => void;
}

export interface ClubPodSheets {
  openActions: (pod: ClubAdminPodRow) => void;
  openPod: (pod: ClubAdminPodRow) => void;
  /** Why the last delete did not go through, or null. */
  deleteError: string | null;
  /** Render ONCE — every sheet the actions open lives here. */
  sheets: ReactNode;
}

/**
 * Every per-pod action of the Club Admin's pods list as one state machine, so
 * only one set of sheets is ever mounted — the same shape as Host Studio's
 * `useHostPodSheets`. A delete is confirmed first: it removes the pod from the
 * club and cannot be undone.
 */
export function useClubPodSheets({ clubId, refetch, onDeleted }: Readonly<Options>): ClubPodSheets {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { openPod: openPodDetail } = useDetailNav();
  const [actionsPod, setActionsPod] = useState<ClubAdminPodRow | null>(null);
  const [activityPod, setActivityPod] = useState<ClubAdminPodRow | null>(null);
  const [deletePod, setDeletePod] = useState<ClubAdminPodRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const openPod = (pod: ClubAdminPodRow) => openPodDetail(pod.club_slug, pod.pod_id);

  /** Close the actions sheet and run one action for the pod it was open on. */
  const withPod = (action: (pod: ClubAdminPodRow) => void) => () => {
    if (actionsPod) action(actionsPod);
    setActionsPod(null);
  };

  const confirmDelete = async () => {
    const pod = deletePod;
    setDeletePod(null);
    if (!pod) return;
    setDeleteError(null);
    try {
      await graphqlRequest(ClubAdminDeletePodDocument, { pod_doc_id: pod.id }, { auth: true });
      onDeleted();
      refetch();
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : t('mweb.studioPods.error'));
    }
  };

  const sheets = (
    <>
      <ClubPodActionsSheet
        pod={actionsPod}
        onClose={() => setActionsPod(null)}
        onDetails={withPod(openPod)}
        onAttendance={withPod((pod) => navigation.navigate('PodAttendance', { podId: pod.id }))}
        onEdit={withPod((pod) => navigation.navigate('ClubPodEdit', { clubId, podId: pod.id }))}
        onActivity={withPod(setActivityPod)}
        onDelete={withPod(setDeletePod)}
      />
      <ClubPodActivitySheet pod={activityPod} onClose={() => setActivityPod(null)} />
      <ConfirmDialog
        open={!!deletePod}
        title={t('clubAdmin.pods.deletePodConfirmTitle')}
        message={t('clubAdmin.pods.deletePodConfirmBody', {
          vars: { title: deletePod?.pod_title ?? '' },
        })}
        confirmLabel={t('mweb.common.delete')}
        destructive
        onConfirm={() => fireAndForget(confirmDelete())}
        onCancel={() => setDeletePod(null)}
        testID="club-pod-delete"
      />
    </>
  );

  return { openActions: setActionsPod, openPod, deleteError, sheets };
}
