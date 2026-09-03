import { MenuItem, Stack, TextField } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { stageFilterOptions } from './helpers';

/** The URL query key the status filter is held in, so a reload keeps it. */
export const STATUS_PARAM = 'status';

interface Props {
  t: (key: string) => string;
  /** The stage being filtered on; '' for every stage. */
  status: string;
  onStatusChange: (status: string) => void;
  onNew: () => void;
}

/**
 * The table's toolbar: the status filter — Open, Enrolling, Live, Expired… —
 * beside the New Auto Pod button. The filter is page-level rather than a
 * column filter so it sits where the admin looks first, and its value rides
 * in the URL (`?status=`) rather than in state, which is what survives a
 * refresh.
 */
export default function AutoPodsToolbar({ t, status, onStatusChange, onNew }: Readonly<Props>) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <TextField
        select
        size="small"
        label={t('admin.autoPods.filterStatus')}
        value={status}
        onChange={(event) => onStatusChange(event.target.value)}
        sx={{ minWidth: 200 }}
        slotProps={{ htmlInput: { 'data-testid': 'auto-pods-status-filter' } }}
      >
        <MenuItem value="">{t('admin.autoPods.filterStatusAll')}</MenuItem>
        {stageFilterOptions(t).map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>
      <DuncitButton size="small" variant="contained" startIcon={<AddIcon />} onClick={onNew}>
        {t('admin.autoPods.newCta')}
      </DuncitButton>
    </Stack>
  );
}
