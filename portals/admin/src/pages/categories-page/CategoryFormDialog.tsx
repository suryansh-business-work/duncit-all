import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import IconPickerField from '../../components/IconPickerField';
import MediaPickerField from '../../components/MediaPickerField';
import IconLayoutSection from './IconLayoutSection';
import { Level, FormState } from './queries';

/** Mirrors the server's MIN_CO_HOSTS..MAX_CO_HOSTS bounds. */
const CO_HOST_LIMITS = [1, 2, 3, 4, 5];

interface DialogState {
  open: boolean;
  level: Level;
  parentId: string | null;
  form: FormState;
}

interface Props {
  dialog: DialogState | null;
  setDialog: (d: DialogState | null) => void;
  busy: boolean;
  opError: string | null;
  onSubmit: () => void;
}

const levelLabel = (level?: Level) => {
  if (level === 'SUPER') return 'Super Category';
  if (level === 'CATEGORY') return 'Category';
  return 'Sub-Category';
};

export default function CategoryFormDialog({
  dialog,
  setDialog,
  busy,
  opError,
  onSubmit,
}: Readonly<Props>) {
  return (
    <Dialog open={!!dialog?.open} onClose={() => setDialog(null)} fullWidth maxWidth="sm">
      <DialogTitle>
        {dialog?.form.id ? 'Edit' : 'New'} {levelLabel(dialog?.level)}
      </DialogTitle>
      <DialogContent>
        {dialog && (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Name"
              value={dialog.form.name}
              onChange={(e) =>
                setDialog({ ...dialog, form: { ...dialog.form, name: e.target.value } })
              }
              fullWidth
              required
            />
            <ToggleButtonGroup
              value={dialog.form.iconMode}
              exclusive
              fullWidth
              size="small"
              onChange={(_event, nextMode) => {
                if (!nextMode) return;
                setDialog({
                  ...dialog,
                  form: { ...dialog.form, iconMode: nextMode, icon: '' },
                });
              }}
            >
              <ToggleButton value="ICON">MUI Icon</ToggleButton>
              <ToggleButton value="IMAGE">Image</ToggleButton>
            </ToggleButtonGroup>
            {dialog.form.iconMode === 'ICON' ? (
              <IconPickerField
                value={dialog.form.icon}
                onChange={(next) =>
                  setDialog({ ...dialog, form: { ...dialog.form, icon: next } })
                }
                helperText="Search Material icons (e.g. Pets, SportsSoccer) or paste an emoji."
              />
            ) : (
              <MediaPickerField
                label="Category image"
                value={dialog.form.icon}
                onChange={(next) =>
                  setDialog({ ...dialog, form: { ...dialog.form, icon: next } })
                }
                folder="/categories/icons"
                helperText="Upload or pick an image to use as the category visual."
              />
            )}
            {/* Icon layout is a CATEGORY-only concept; the server rejects it on
                SUPER/SUB, so the controls are only offered here. */}
            {dialog.level === 'CATEGORY' && (
              <IconLayoutSection
                form={dialog.form}
                onFormChange={(form) => setDialog({ ...dialog, form })}
              />
            )}
            <TextField
              label="Description"
              value={dialog.form.description}
              onChange={(e) =>
                setDialog({
                  ...dialog,
                  form: { ...dialog.form, description: e.target.value },
                })
              }
              multiline
              minRows={2}
              fullWidth
            />
            <TextField
              label="Images & Videos (one URL per line)"
              value={dialog.form.mediaText}
              onChange={(e) =>
                setDialog({
                  ...dialog,
                  form: { ...dialog.form, mediaText: e.target.value },
                })
              }
              multiline
              minRows={3}
              helperText="URLs ending in .mp4/.mov/.webm are stored as VIDEO, others as IMAGE."
              fullWidth
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Sort order"
                type="number"
                value={dialog.form.sort_order}
                onChange={(e) =>
                  setDialog({
                    ...dialog,
                    form: { ...dialog.form, sort_order: Number(e.target.value) || 0 },
                  })
                }
                sx={{ maxWidth: 160 }}
              />
              {dialog.form.id && (
                <TextField
                  label="Status"
                  select
                  value={dialog.form.is_active ? 'active' : 'inactive'}
                  onChange={(e) =>
                    setDialog({
                      ...dialog,
                      form: { ...dialog.form, is_active: e.target.value === 'active' },
                    })
                  }
                  sx={{ minWidth: 160 }}
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </TextField>
              )}
            </Stack>

            {/* Co-hosting is configured per SUB-category — the server rejects
                these fields on SUPER/CATEGORY, so they are only offered here. */}
            {dialog.level === 'SUB' && (
              <Stack spacing={1.5}>
                <FormControlLabel
                  control={
                    <Switch
                      inputProps={{ 'aria-label': 'Allow Co-Hosts' }}
                      checked={dialog.form.allow_co_hosts}
                      onChange={(e) =>
                        setDialog({
                          ...dialog,
                          form: { ...dialog.form, allow_co_hosts: e.target.checked },
                        })
                      }
                    />
                  }
                  label="Allow Co-Hosts"
                />
                {dialog.form.allow_co_hosts && (
                  <TextField
                    label="Max co-hosts per pod"
                    select
                    value={dialog.form.max_co_hosts}
                    onChange={(e) =>
                      setDialog({
                        ...dialog,
                        form: { ...dialog.form, max_co_hosts: Number(e.target.value) || 1 },
                      })
                    }
                    helperText="How many co-hosts a host may invite to one pod in this sub-category."
                    sx={{ maxWidth: 260 }}
                  >
                    {CO_HOST_LIMITS.map((n) => (
                      <MenuItem key={n} value={n}>
                        {n}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              </Stack>
            )}
            {opError && <Alert severity="error">{opError}</Alert>}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setDialog(null)}>Cancel</Button>
        <Button
          variant="contained"
          onClick={onSubmit}
          disabled={busy || !dialog?.form.name?.trim()}
        >
          {busy ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
