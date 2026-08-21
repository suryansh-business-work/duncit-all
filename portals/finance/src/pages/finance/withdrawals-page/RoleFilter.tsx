import { MenuItem, TextField } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { ALL_ROLES, WITHDRAWER_ROLES, translatedRoleLabel, type RoleFilterValue } from './roles';

interface Props {
  value: RoleFilterValue;
  onChange: (value: RoleFilterValue) => void;
}

/**
 * Page-level Role filter. It drives the table's `externalFilters` rather than a
 * column filter, so the chosen role stays pinned across search, sort and paging
 * instead of reading as one dismissible chip among many — and, because those
 * are compared by value, changing it resets to page 1 and refetches.
 */
export default function RoleFilter({ value, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <TextField
      select
      size="small"
      label={t('finance.withdrawals.roleFilter')}
      value={value}
      onChange={(e) => onChange(e.target.value as RoleFilterValue)}
      sx={{ minWidth: 200 }}
    >
      <MenuItem value={ALL_ROLES}>{t('finance.withdrawals.roleAll')}</MenuItem>
      {WITHDRAWER_ROLES.map((role) => (
        <MenuItem key={role} value={role}>
          {translatedRoleLabel(t, role)}
        </MenuItem>
      ))}
    </TextField>
  );
}
