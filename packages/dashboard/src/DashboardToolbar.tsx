import { Stack, Typography } from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import DownloadIcon from '@mui/icons-material/Download';
import { DuncitButton } from '@duncit/buttons';
import { SKIP_IN_DOWNLOAD } from './download';

export type DashboardToolbarProps = Readonly<{
  editing: boolean;
  saving: boolean;
  /** Nothing has moved since editing began — Save has nothing to write. */
  dirty: boolean;
  /** The image is being made — Download is busy. */
  downloading: boolean;
  labels: Readonly<{
    customise: string;
    editing: string;
    hint: string;
    save: string;
    saving: string;
    cancel: string;
    reset: string;
    download: string;
    downloading: string;
  }>;
  onStart: () => void;
  onSave: () => void;
  onCancel: () => void;
  onReset: () => void;
  onDownload: () => void;
}>;

/**
 * The dashboard's own controls, rendered above the grid and left out of the
 * downloaded picture.
 *
 * Rearranging is behind an explicit mode rather than always live: a dashboard
 * is mostly read, and a grid that moves whenever a pointer drifts across a card
 * header is a dashboard people stop trusting. Download is offered only at rest,
 * so the picture never carries edit handles.
 */
export function DashboardToolbar({
  editing,
  saving,
  dirty,
  downloading,
  labels,
  onStart,
  onSave,
  onCancel,
  onReset,
  onDownload,
}: DashboardToolbarProps) {
  if (!editing) {
    return (
      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        {...SKIP_IN_DOWNLOAD}
        sx={{ justifyContent: 'flex-end', flexWrap: 'wrap' }}
      >
        <DuncitButton
          size="small"
          color="inherit"
          startIcon={<DownloadIcon />}
          onClick={onDownload}
          disabled={downloading}
        >
          {downloading ? labels.downloading : labels.download}
        </DuncitButton>
        <DuncitButton size="small" startIcon={<TuneIcon />} onClick={onStart}>
          {labels.customise}
        </DuncitButton>
      </Stack>
    );
  }

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1}
      {...SKIP_IN_DOWNLOAD}
      sx={{
        alignItems: { xs: 'stretch', sm: 'center' },
        justifyContent: "space-between",
        p: 1,
        borderRadius: 2,
        bgcolor: 'action.hover'
      }}>
      <Typography variant="caption" sx={{
        color: "text.secondary"
      }}>
        <strong>{labels.editing}</strong> — {labels.hint}
      </Typography>
      <Stack direction="row" spacing={1} sx={{
        justifyContent: "flex-end"
      }}>
        <DuncitButton size="small" color="inherit" startIcon={<RestartAltIcon />} onClick={onReset} disabled={saving}>
          {labels.reset}
        </DuncitButton>
        <DuncitButton size="small" color="inherit" startIcon={<CloseIcon />} onClick={onCancel} disabled={saving}>
          {labels.cancel}
        </DuncitButton>
        <DuncitButton
          size="small"
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={onSave}
          disabled={saving || !dirty}
        >
          {saving ? labels.saving : labels.save}
        </DuncitButton>
      </Stack>
    </Stack>
  );
}
