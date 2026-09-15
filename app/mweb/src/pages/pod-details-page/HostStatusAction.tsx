import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import CloseIcon from '@mui/icons-material/Close';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  onAddStatus: () => void;
}

/**
 * The host's "Add status" affordance on their own pod: the button, a note that
 * nobody else sees it, and an info button that explains what a status does.
 * The parent renders it only for the pod's hosts. Native twin:
 * details/PodHostStatus.
 */
export default function HostStatusAction({ onAddStatus }: Readonly<Props>) {
  const { t } = useTranslation();
  const [infoOpen, setInfoOpen] = useState(false);

  return (
    <Stack spacing={0.5} data-testid="pod-host-status" sx={{ flexShrink: 0, alignItems: 'flex-end' }}>
      <DuncitButton
        size="small"
        startIcon={<AddPhotoAlternateIcon />}
        onClick={onAddStatus}
        data-testid="pod-overview-add-status"
        sx={{ minHeight: 36, bgcolor: 'background.paper', color: 'text.primary', '&:hover': { bgcolor: 'background.paper' } }}
      >
        {t('mweb.podDetails.addStatus')}
      </DuncitButton>
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: 'text.secondary' }}>
        <VisibilityOutlinedIcon data-testid="pod-host-status-visibility-icon" sx={{ fontSize: 14 }} />
        <Typography variant="caption" data-testid="pod-host-status-only-you">
          {t('mweb.podDetails.addStatusOnlyYou')}
        </Typography>
        <DuncitIconButton
          size="small"
          data-testid="pod-host-status-info"
          aria-label={t('mweb.podDetails.addStatusInfoLabel')}
          onClick={() => setInfoOpen(true)}
          sx={{ p: 0.25 }}
        >
          <InfoOutlinedIcon fontSize="inherit" color="action" />
        </DuncitIconButton>
      </Stack>
      <Dialog data-testid="pod-host-status-info-dialog" open={infoOpen} onClose={() => setInfoOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ pr: 6, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <VisibilityOutlinedIcon color="primary" fontSize="small" />
          {t('mweb.podDetails.addStatusOnlyYou')}
          <DuncitIconButton
            data-testid="pod-host-status-info-close"
            onClick={() => setInfoOpen(false)}
            aria-label={t('mweb.podDetails.close')}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </DuncitIconButton>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" data-testid="pod-host-status-info-body" sx={{ color: 'text.secondary' }}>
            {t('mweb.podDetails.addStatusInfoBody')}
          </Typography>
        </DialogContent>
      </Dialog>
    </Stack>
  );
}
