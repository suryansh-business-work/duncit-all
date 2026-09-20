import { useState, type ReactNode } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { RequestChangeSheet } from '@/components/change-requests/RequestChangeSheet';
import { ClubAdminDeletePodDocument } from '@/graphql/club-admin';
import { usePodChangeRequests } from '@/hooks/usePodChangeRequests';
import type { ClubAdminPodRow } from '@/hooks/useClubAdminPods';
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
  const [actionsPod, setActionsPod] = useState<ClubAdminPodRow | null>(null);
  const [activityPod, setActivityPod] = useState<ClubAdminPodRow | null>(null);
  const [deletePod, setDeletePod] = useState<ClubAdminPodRow | null>(null);
  const [changePod, setChangePod] = useState<ClubAdminPodRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const change = usePodChangeRequests();

  /**
   * The CLUB-SCOPED detail, not the public pod page.
   *
   * It used to open `useDetailNav().openPod`, which is the page a member sees
   * — so a club admin pressing "Pod Details" got none of the roster, payments,
   * ratings or audit trail their own page is for. mWeb and the Partners
   * console have always mounted `@duncit/pod-details` at CLUB_ADMIN scope here
   * (rule 27); this is its Tamagui twin.
   */
  const openPod = (pod: ClubAdminPodRow) =>
    navigation.navigate('ClubPodDetails', { clubId, podId: pod.id });

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
        onRequestChange={withPod(setChangePod)}
        onDelete={withPod(setDeletePod)}
      />
      <ClubPodActivitySheet pod={activityPod} onClose={() => setActivityPod(null)} />
      {/* The same ask Club Studio offers, reachable from the row an admin is
          actually looking at. CLUB-level: approving hands over the whole club,
          which is what the sheet's copy says. */}
      <RequestChangeSheet
        open={!!changePod}
        role="CLUB_ADMIN"
        penalty={change.board.penalties.club_admin_penalty}
        attendeeCount={changePod?.seats_taken ?? 0}
        busy={change.busy}
        errorText={change.feedback?.ok === false ? change.feedback.text : null}
        onClose={() => setChangePod(null)}
        onConfirm={(reason) => {
          const pod = changePod;
          if (!pod) return;
          fireAndForget(
            change.file(pod.id, 'CLUB_ADMIN', reason, t('changeRequest.filed')).then((ok) => {
              if (ok) setChangePod(null);
              return undefined;
            }),
          );
        }}
      />
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
