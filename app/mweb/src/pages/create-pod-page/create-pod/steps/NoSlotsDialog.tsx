import { Alert, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../../../i18n/useTranslation';
import type { CreatePodClub } from '../create-pod.types';
import { useClubSlotRequest } from './useClubSlotRequest';

interface Props {
  /** The club the host tried to pick; null keeps the dialog closed. */
  club: CreatePodClub | null;
  onClose: () => void;
}

/**
 * Shown instead of selecting a club whose venues have no open slot: a physical
 * pod cannot be planned there, so the host picks another club — or messages
 * the club admin (WhatsApp + email) to get the venues to open slots.
 * Native twin: NoSlotsSheet (rule 27).
 */
export default function NoSlotsDialog({ club, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const { ask, loading, notice } = useClubSlotRequest(club?.id ?? '');
  const sent = notice !== null && notice.severity !== 'error';

  return (
    <Dialog
      data-testid="create-pod-no-slots-dialog"
      open={club !== null}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      aria-labelledby="create-pod-no-slots-title"
    >
      <DialogTitle id="create-pod-no-slots-title" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <EventBusyOutlinedIcon color="warning" aria-hidden />
        {t('mweb.createPod.noSlotsTitle')}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={1.5}>
          <Alert severity="warning">
            {t('mweb.createPod.noSlotsBody', { vars: { club: club?.club_name ?? '' } })}
          </Alert>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('mweb.createPod.noSlotsAskHint')}
          </Typography>
          {notice && (
            <Alert severity={notice.severity} role="status" data-testid="create-pod-no-slots-notice">
              {t(notice.key)}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1, flexWrap: 'wrap' }}>
        <DuncitButton
          data-testid="create-pod-no-slots-notify"
          variant="outlined"
          onClick={ask}
          loading={loading}
          disabled={sent}
        >
          {t('mweb.createPod.noSlotsNotifyAdmin')}
        </DuncitButton>
        <DuncitButton data-testid="create-pod-no-slots-choose" variant="contained" onClick={onClose}>
          {t('mweb.createPod.noSlotsChooseAnother')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
