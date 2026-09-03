import type { ReactNode } from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SmsIcon from '@mui/icons-material/Sms';
import EditNoteIcon from '@mui/icons-material/EditNote';
import { DuncitButton } from '@duncit/buttons';
import type { PodAttendanceLabels, PodAttendanceRow } from '@duncit/utils';

interface Props {
  row: PodAttendanceRow | null;
  labels: PodAttendanceLabels;
  onClose: () => void;
  onChooseOtp: () => void;
  onChooseDirect: () => void;
}

/** One of the two doors, as a button big enough to read the reason on. */
function DoorOption({
  icon,
  title,
  body,
  testId,
  onClick,
}: Readonly<{
  icon: ReactNode;
  title: string;
  body: string;
  testId: string;
  onClick: () => void;
}>) {
  return (
    <DuncitButton
      variant="outlined"
      data-testid={testId}
      onClick={onClick}
      sx={{
        borderRadius: '16px',
        // A button carrying two lines of prose, so MUI's centred, upper-cased
        // label treatment is undone rather than fought with per child.
        textTransform: 'none',
        textAlign: 'left',
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        gap: 1.25,
        px: 1.5,
        py: 1.5,
      }}
    >
      {icon}
      <Stack sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
          {title}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', whiteSpace: 'normal' }}>
          {body}
        </Typography>
      </Stack>
      <ChevronRightIcon fontSize="small" />
    </DuncitButton>
  );
}

/**
 * Which door a Club Admin is marking through.
 *
 * They get two different calls, and the board used to answer only one of them.
 * "I could not scan them" wants a one-time code sent to the attendee — the
 * strongest proof still available once the QR is gone. "The host forgot the
 * whole pod and read me the names" wants no code at all, because ringing every
 * attendee for one is exactly the work that call is delegating.
 *
 * So the choice is asked rather than assumed. It is also asked FIRST, before
 * either dialog's own form, so the admin is never halfway through sending a
 * code they did not want to send.
 */
export default function ClubAdminMarkDialog({
  row,
  labels,
  onClose,
  onChooseOtp,
  onChooseDirect,
}: Readonly<Props>) {
  return (
    <Dialog open={!!row} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 800 }}>{labels.chooseTitle(row?.name ?? '')}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {labels.chooseBody}
          </Typography>
          <DoorOption
            icon={<SmsIcon fontSize="small" />}
            title={labels.chooseOtpTitle}
            body={labels.chooseOtpBody}
            testId="attendance-choose-otp"
            onClick={onChooseOtp}
          />
          <DoorOption
            icon={<EditNoteIcon fontSize="small" />}
            title={labels.chooseDirectTitle}
            body={labels.chooseDirectBody}
            testId="attendance-choose-direct"
            onClick={onChooseDirect}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose}>{labels.chooseCancel}</DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
