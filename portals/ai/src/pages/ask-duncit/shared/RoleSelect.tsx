import { MenuItem, TextField } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { roleLabelKey } from '@duncit/utils';
import { ROLE_KEYS, type RoleKey } from './types';

/** Picks the assistant role a page is about; labels are the apps' own role names. */
export default function RoleSelect({ value, onChange }: Readonly<{ value: RoleKey; onChange: (role: RoleKey) => void }>) {
  const { t } = useTranslation();
  return (
    <TextField select size="small" label={t('ai.askDuncit.role')} value={value} onChange={(e) => onChange(e.target.value as RoleKey)} sx={{ minWidth: 220 }}>
      {ROLE_KEYS.map((role) => (
        <MenuItem key={role} value={role}>
          {t(roleLabelKey(role))}
        </MenuItem>
      ))}
    </TextField>
  );
}
