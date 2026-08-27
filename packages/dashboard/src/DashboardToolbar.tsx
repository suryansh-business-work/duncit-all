import { Stack, Typography } from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { DuncitButton } from '@duncit/buttons';

export type DashboardToolbarProps = Readonly<{
  editing: boolean;
  saving: boolean;
  /** Nothing has moved since editing began — Save has nothing to write. */
  dirty: boolean;
  labels: Readonly<{
    customise: string;
    editing: string;
    hint: string;
    save: string;
    saving: string;
    cancel: string;
    reset: string;
  }>;
  onStart: () => void;
  onSave: () => void;
  onCancel: () => void;
  onReset: () => void;
}>;

/**
 * The dashboard's own controls, rendered above the grid.
 *
 * Rearranging is behind an explicit mode rather than always live: a dashboard
 * is mostly read, and a grid that moves whenever a pointer drifts across a card
 * header is a dashboard people stop trusting.
 */
export function DashboardToolbar({
  editing,
  saving,
  dirty,
  labels,
  onStart,
  onSave,
  onCancel,
  onReset,
}: DashboardToolbarProps) {
  if (!editing) {
    return (
      <Stack direction="row" sx={{
        justifyContent: "flex-end"
      }}>
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
