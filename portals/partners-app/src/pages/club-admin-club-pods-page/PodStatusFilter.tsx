import { useMemo } from 'react';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { podRowStatusOptions, type PodRowStatusFilter } from '@duncit/utils';
import { useTranslation } from '../../i18n';

interface Props {
  value: PodRowStatusFilter;
  onChange: (value: PodRowStatusFilter) => void;
}

/**
 * Narrows the club's pods table to one bucket of its Status column.
 *
 * It sits in the table toolbar beside "+ New Pod" rather than in the Filters
 * popover because the chip is derived from four fields at once — the popover
 * only offers the raw `is_active` boolean, which cannot tell a cancelled pod
 * from a draft. The value is a query argument, so the server pages over the
 * chosen status instead of the table filtering the page it already fetched.
 */
export default function PodStatusFilter({ value, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const options = useMemo(() => podRowStatusOptions(t), [t]);

  return (
    <TextField
      select
      size="small"
      label={t('clubAdmin.pods.statusFilter')}
      value={value}
      onChange={(event) => onChange(event.target.value as PodRowStatusFilter)}
      sx={{ minWidth: 170 }}
    >
      {options.map((option) => (
        <MenuItem key={option.label} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  );
}
