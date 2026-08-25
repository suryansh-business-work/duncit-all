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
import GiftCardArtworkSection from './GiftCardArtworkSection';
import { Level, FormState } from './queries';
import { useTranslation } from '@duncit/shell';

/** Mirrors the server's MIN_CO_HOSTS..MAX_CO_HOSTS bounds. */
const CO_HOST_LIMITS = [1, 2, 3, 4, 5];

/** Mirrors the server bounds on Category.min_pax (0 = no minimum set). */
export const MIN_PAX_FLOOR = 0;
export const MIN_PAX_CEILING = 50;

/** A number input hands back a string and permits anything typed; keep the
 * stored value a whole number inside the bounds the server will accept, so the
 * admin cannot save something it would reject. */
export const clampMinPax = (raw: string): number => {
  const value = Math.trunc(Number(raw));
  if (!Number.isFinite(value)) return MIN_PAX_FLOOR;
  return Math.min(MIN_PAX_CEILING, Math.max(MIN_PAX_FLOOR, value));
};

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
  const { t } = useTranslation();
  return (
    <Dialog open={!!dialog?.open} onClose={() => setDialog(null)} fullWidth maxWidth="sm">
      <DialogTitle>
        {dialog?.form.id ? 'Edit' : 'New'} {levelLabel(dialog?.level)}
      </DialogTitle>
      <DialogContent>
        {dialog && (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label={t('shell.common.name')}
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
              <ToggleButton value="ICON">{t('admin.categories.muiIcon')}</ToggleButton>
              <ToggleButton value="IMAGE">{t('admin.branding.assetImage')}</ToggleButton>
            </ToggleButtonGroup>
            {dialog.form.iconMode === 'ICON' ? (
              <IconPickerField
                value={dialog.form.icon}
                onChange={(next) =>
                  setDialog({ ...dialog, form: { ...dialog.form, icon: next } })
                }
                helperText={t('admin.categories.muiIconHint')}
              />
            ) : (
              <MediaPickerField
                label={t('admin.categories.image')}
                value={dialog.form.icon}
                onChange={(next) =>
                  setDialog({ ...dialog, form: { ...dialog.form, icon: next } })
                }
                folder="/categories/icons"
                helperText={t('admin.categories.imageHint')}
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
              label={t('shell.common.description')}
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
            {/* Gift card artwork is offered on every level — a card is sold
                for a super category, a category and a sub-category alike. */}
            <GiftCardArtworkSection
              form={dialog.form}
              onFormChange={(form) => setDialog({ ...dialog, form })}
            />
            <TextField
              label={t('admin.categories.media')}
              value={dialog.form.mediaText}
              onChange={(e) =>
                setDialog({
                  ...dialog,
                  form: { ...dialog.form, mediaText: e.target.value },
                })
              }
              multiline
              minRows={3}
              helperText={t('admin.categories.mediaHint')}
              fullWidth
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label={t('admin.podPlans.sortOrder')}
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
                  label={t('shell.common.status')}
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
                  <MenuItem value="active">{t('admin.profile.active')}</MenuItem>
                  <MenuItem value="inactive">{t('admin.profile.inactive')}</MenuItem>
                </TextField>
              )}
            </Stack>

            {/* Co-hosting is configured per SUB-category — the server rejects
                these fields on SUPER/CATEGORY, so they are only offered here. */}
            {dialog.level === 'SUB' && (
              <Stack spacing={1.5}>
                <TextField
                  label={t('admin.categories.minPax')}
                  type="number"
                  value={dialog.form.min_pax}
                  onChange={(e) =>
                    setDialog({
                      ...dialog,
                      form: { ...dialog.form, min_pax: clampMinPax(e.target.value) },
                    })
                  }
                  helperText={`The fewest people this activity needs (a doubles game needs 4). A host sizing a pod here cannot go below it. 0 = no minimum. Max ${MIN_PAX_CEILING}.`}
                  sx={{ maxWidth: 320 }}
                  slotProps={{
                    htmlInput: { min: MIN_PAX_FLOOR, max: MIN_PAX_CEILING, 'aria-label': 'Min number of pax allowed' }
                  }}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={dialog.form.allow_co_hosts}
                      onChange={(e) =>
                        setDialog({
                          ...dialog,
                          form: { ...dialog.form, allow_co_hosts: e.target.checked },
                        })
                      }
                      slotProps={{
                        input: { 'aria-label': 'Allow Co-Hosts' }
                      }}
                    />
                  }
                  label={t('admin.categories.allowCoHosts')}
                />
                {dialog.form.allow_co_hosts && (
                  <TextField
                    label={t('admin.categories.maxCoHosts')}
                    select
                    value={dialog.form.max_co_hosts}
                    onChange={(e) =>
                      setDialog({
                        ...dialog,
                        form: { ...dialog.form, max_co_hosts: Number(e.target.value) || 1 },
                      })
                    }
                    helperText={t('admin.categories.maxCoHostsHint')}
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
        <Button onClick={() => setDialog(null)}>{t('shell.common.cancel')}</Button>
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
