import { FormControlLabel, MenuItem, Stack, Switch, TextField } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { CO_HOST_LIMITS, MIN_PAX_CEILING, MIN_PAX_FLOOR, clampMinPax, type DialogState } from './constants';

interface Props {
  dialog: DialogState;
  setDialog: (d: DialogState | null) => void;
}

/** Min pax + co-hosting controls, configured per SUB-category. */
export default function CoHostSection({ dialog, setDialog }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
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
              form: { ...dialog.form, max_co_hosts: Number(e.target.value) },
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
  );
}
