import { RequestChangeSheet } from '@/components/change-requests/RequestChangeSheet';
import { PodClubAdminSheet } from '@/components/host-manage/PodClubAdminSheet';
import { TicketScanDialog } from '@/components/host-manage/ticket-scan';
import { PodDeleteDialog } from '@/components/host-manage/PodDeleteDialog';
import { PodEditDialog } from '@/components/host-manage/PodEditDialog';
import { PodCompleteDialog } from '@/components/host-manage/PodCompleteDialog';
import { PodResubmitDialog } from '@/components/host-manage/PodResubmitDialog';

import type { HostPodSheetState } from './useHostPodSheets';

/** Every sheet and dialog an action opens, mounted once for all three sections. */
export function HostPodDialogs({
  s,
  onPodCompleted,
}: Readonly<{ s: HostPodSheetState; onPodCompleted?: () => void }>) {
  const { navigation, change, t, changePod, clubAdminPod, reload } = s;
  return (
    <>
      <RequestChangeSheet
        open={!!changePod}
        role="HOST"
        penalty={change.board.penalties.host_penalty}
        attendeeCount={changePod?.seats_taken ?? 0}
        busy={change.busy}
        errorText={change.feedback?.ok === false ? change.feedback.text : null}
        onClose={() => s.setChangePod(null)}
        onConfirm={(reason) => {
          const pod = changePod;
          if (!pod) return;
          change
            .file(pod.id, 'HOST', reason, t('changeRequest.filed'))
            .then((ok) => {
              if (ok) s.setChangePod(null);
              return undefined;
            })
            .catch(() => undefined);
        }}
      />
      <PodClubAdminSheet
        pod={clubAdminPod}
        onClose={() => s.setClubAdminPod(null)}
        onSupport={() => {
          if (clubAdminPod) {
            navigation.navigate('SupportTickets', {
              podId: clubAdminPod.id,
              podTitle: clubAdminPod.pod_title,
            });
          }
          s.setClubAdminPod(null);
        }}
      />
      <TicketScanDialog
        pod={s.scanPod}
        onClose={() => s.setScanPod(null)}
        onOpenProfile={(userId) => {
          s.setScanPod(null);
          navigation.navigate('PublicProfile', { userId });
        }}
      />
      <PodEditDialog
        pod={s.editPod}
        onClose={() => s.setEditPod(null)}
        onSaved={() => {
          s.setEditPod(null);
          reload();
        }}
      />
      <PodResubmitDialog
        pod={s.resubmitPod}
        onClose={() => s.setResubmitPod(null)}
        onSaved={() => {
          s.setResubmitPod(null);
          reload();
        }}
      />
      <PodDeleteDialog
        podId={s.deletePod?.id ?? null}
        podTitle={s.deletePod?.title ?? ''}
        onClose={() => s.setDeletePod(null)}
        onDeleted={() => {
          s.setDeletePod(null);
          reload();
        }}
      />
      <PodCompleteDialog
        key={s.completePod?.id ?? 'none'}
        pod={s.completePod}
        onClose={() => s.setCompletePod(null)}
        onCompleted={() => {
          s.setCompletePod(null);
          reload();
          onPodCompleted?.();
        }}
      />
    </>
  );
}
