import type { PodAttendanceLabels } from '@duncit/utils';
import AttendanceOtpDialog from './AttendanceOtpDialog';
import ClubAdminMarkDialog from './ClubAdminMarkDialog';
import ForceMarkDialog from './ForceMarkDialog';
import type { AttendanceBoardApi } from './useAttendanceBoard';

interface Props {
  podId: string;
  labels: PodAttendanceLabels;
  api: AttendanceBoardApi;
}

/**
 * Everything the roster opens on top of itself.
 *
 * One component rather than three loose siblings in the page, because only one
 * of them is ever open and the hook already decides which: the page reads as a
 * roster again, and the order the dialogs hand off in — choose, then prove or
 * name — stays legible in one place.
 *
 * The chooser is the Club Admin's only, and it is asked FIRST: they get two
 * different calls ("I could not scan them", and "the host forgot the whole pod,
 * here are the names"), and answering them the same way is what left the second
 * one with no path at all. The host is never asked — the admin setting has
 * already answered it for them.
 */
export default function AttendanceDialogs({ podId, labels, api }: Readonly<Props>) {
  return (
    <>
      <ClubAdminMarkDialog
        row={api.choiceRow}
        labels={labels}
        onClose={api.cancelChoice}
        onChooseOtp={api.chooseOtp}
        onChooseDirect={api.chooseDirect}
      />
      <AttendanceOtpDialog
        podId={podId}
        row={api.otpRow}
        labels={labels}
        onClose={api.cancelOtp}
        onVerified={api.finishMark}
      />
      <ForceMarkDialog
        row={api.forceRow}
        labels={labels}
        busy={!!api.busyId}
        onClose={api.cancelForce}
        onConfirm={api.confirmForce}
      />
    </>
  );
}
