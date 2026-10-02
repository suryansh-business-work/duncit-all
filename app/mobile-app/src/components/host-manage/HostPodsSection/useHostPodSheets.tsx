import { useState, type ReactNode } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useDetailNav } from '@/hooks/useDetailNav';
import type { RootStackParamList } from '@/navigation/types';
import { useFeedbackLinkActions, usePodMediaLinkActions } from '@/hooks/usePodLinkActions';
import type { HostPod } from '@/hooks/useHostPods';
import { usePodChangeRequests } from '@/hooks/usePodChangeRequests';
import { useTranslation } from '@/hooks/useTranslation';
import type { ScanTarget } from '@/components/host-manage/ticket-scan';
import type { HostPodSummary } from '@/components/host-manage/pod-edit.form';
import type { HostPodForComplete } from '@/components/host-manage/pod-complete.form';
import type { HostPodForResubmit } from '@/components/host-manage/pod-resubmit.form';

import { HostPodActionsSheet } from './HostPodActionsSheet';
import { HostPodDialogs } from './HostPodDialogs';

interface Options {
  /** Re-reads the host's pods after anything that alters one. */
  refetch: () => Promise<unknown>;
  /** Fired after a pod completes — the screen refetches the Host Share list,
   * which the completion just added a payout to. */
  onPodCompleted?: () => void;
}

export interface HostPodSheets {
  /** Opens the per-pod actions sheet. */
  openActions: (pod: HostPod) => void;
  /** Opens the pod's public detail screen. */
  openPod: (pod: HostPod) => void;
  /** Confirmation line from the last link action, or null. */
  notice: string | null;
  /** Render ONCE — every sheet and dialog the actions open lives here. */
  sheets: ReactNode;
}

/**
 * Every per-pod action of Host Studio as one state machine, so Requested Pods,
 * Your Pods and Rejected Pods share it: a pod keeps exactly the same sheet
 * wherever the venue's decision has put it, and only one set of dialogs is ever
 * mounted. The Tamagui twin of mWeb's `useHostPodActions` (rule 27).
 */
export function useHostPodSheets({ refetch, onPodCompleted }: Readonly<Options>): HostPodSheets {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { openPod: openPodDetail } = useDetailNav();
  const feedbackLink = useFeedbackLinkActions();
  const mediaLink = usePodMediaLinkActions();
  // The whole row, not the narrower edit shape — the sheet routes to complete,
  // resubmit and cancel, which each need different fields off the pod.
  const [actionsPod, setActionsPod] = useState<HostPod | null>(null);
  // "Request Change Host" — one instance for all three sections, exactly like
  // the actions sheet above: a pod keeps the same behaviour wherever it sits.
  const [changePod, setChangePod] = useState<HostPod | null>(null);
  const change = usePodChangeRequests();
  const { t } = useTranslation();
  const [scanPod, setScanPod] = useState<ScanTarget | null>(null);
  const [editPod, setEditPod] = useState<HostPodSummary | null>(null);
  const [resubmitPod, setResubmitPod] = useState<HostPodForResubmit | null>(null);
  const [deletePod, setDeletePod] = useState<{ id: string; title: string } | null>(null);
  const [completePod, setCompletePod] = useState<HostPodForComplete | null>(null);
  const [clubAdminPod, setClubAdminPod] = useState<HostPod | null>(null);

  const reload = () => {
    refetch().catch(() => undefined);
  };

  const s = {
    navigation,
    feedbackLink,
    mediaLink,
    actionsPod,
    setActionsPod,
    changePod,
    setChangePod,
    change,
    t,
    scanPod,
    setScanPod,
    editPod,
    setEditPod,
    resubmitPod,
    setResubmitPod,
    deletePod,
    setDeletePod,
    completePod,
    setCompletePod,
    clubAdminPod,
    setClubAdminPod,
    reload,
  };

  const sheets = (
    <>
      <HostPodActionsSheet s={s} />
      <HostPodDialogs s={s} onPodCompleted={onPodCompleted} />
    </>
  );

  return {
    openActions: setActionsPod,
    openPod: (pod) => openPodDetail(pod.club_slug, pod.pod_id),
    notice: feedbackLink.notice ?? mediaLink.notice ?? null,
    sheets,
  };
}

/** The state every Host Studio sheet reads and writes — built once per render
 * by `useHostPodSheets` and handed to the sheet components it renders. */
export interface HostPodSheetState {
  navigation: NativeStackNavigationProp<RootStackParamList>;
  feedbackLink: ReturnType<typeof useFeedbackLinkActions>;
  mediaLink: ReturnType<typeof usePodMediaLinkActions>;
  actionsPod: HostPod | null;
  setActionsPod: (pod: HostPod | null) => void;
  changePod: HostPod | null;
  setChangePod: (pod: HostPod | null) => void;
  change: ReturnType<typeof usePodChangeRequests>;
  t: ReturnType<typeof useTranslation>['t'];
  scanPod: ScanTarget | null;
  setScanPod: (pod: ScanTarget | null) => void;
  editPod: HostPodSummary | null;
  setEditPod: (pod: HostPodSummary | null) => void;
  resubmitPod: HostPodForResubmit | null;
  setResubmitPod: (pod: HostPodForResubmit | null) => void;
  deletePod: { id: string; title: string } | null;
  setDeletePod: (pod: { id: string; title: string } | null) => void;
  completePod: HostPodForComplete | null;
  setCompletePod: (pod: HostPodForComplete | null) => void;
  clubAdminPod: HostPod | null;
  setClubAdminPod: (pod: HostPod | null) => void;
  reload: () => void;
}
