import { Chip, Stack, Typography } from '@mui/material';
import { EM_DASH } from '@duncit/table';
import type { AudienceRow } from '../helpers';

export const dash = (value?: string | null) => value || EM_DASH;

export const yesNo = (value: boolean) => (value ? 'Yes' : 'No');

/** Columns that are a filter axis only — the row carries no value to show. */
export const filterOnly = () => EM_DASH;

export const renderPerson = (row: AudienceRow) => (
  <Stack spacing={0} sx={{ lineHeight: 1.3 }}>
    <Typography variant="body2" fontWeight={700} noWrap>
      {row.full_name || EM_DASH}
    </Typography>
    <Typography variant="caption" color="text.secondary" noWrap>
      {dash(row.email)}
    </Typography>
  </Stack>
);

const renderChips = (values: string[]) => {
  if (values.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        {EM_DASH}
      </Typography>
    );
  }
  return (
    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
      {values.map((value) => (
        <Chip key={value} label={value} size="small" variant="outlined" />
      ))}
    </Stack>
  );
};

export const renderRoles = (row: AudienceRow) => renderChips(row.roles);
export const renderPush = (row: AudienceRow) => renderChips(row.push_platforms);
