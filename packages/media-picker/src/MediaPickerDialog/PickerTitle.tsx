import { DialogTitle } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitIconButton } from '@duncit/buttons';
import { AiMonitoringChip } from '@duncit/ai-monitoring/mui';
import { useTranslation } from '../i18n/useTranslation';

interface PickerTitleProps {
  titleRowId: string;
  headingId: string;
  heading: string;
  uploading: boolean;
  onClose: () => void;
}

/** The title row: the heading, the AI-monitoring notice and the Close button. */
export default function PickerTitle({ titleRowId, headingId, heading, uploading, onClose }: Readonly<PickerTitleProps>) {
  const { t } = useTranslation();
  return (
    // The notice belongs on the title row, not next to the Upload button:
    // it has to be readable BEFORE a file is chosen, and this dialog is the
    // one screen every picker-driven upload in mWeb and the portals passes
    // through.
    <DialogTitle id={titleRowId} sx={{ pr: 6, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
      <span id={headingId}>{heading}</span>
      <AiMonitoringChip />
      <DuncitIconButton
        onClick={onClose}
        disabled={uploading}
        aria-label={t('media.a11y.close')}
        data-testid="media-picker-close"
        sx={{ position: 'absolute', right: 8, top: 8 }}
        size="small"
      >
        <CloseIcon fontSize="small" />
      </DuncitIconButton>
    </DialogTitle>
  );
}
