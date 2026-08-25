import { Chip, Stack, Typography } from '@mui/material';
import { EM_DASH } from '@duncit/table';
import type { AudienceRow } from '../helpers';

export const dash = (value?: string | null) => value || EM_DASH;

export const yesNo = (value: boolean) => (value ? 'Yes' : 'No');

export const renderPerson = (row: AudienceRow) => (
  <Stack spacing={0} sx={{ lineHeight: 1.3 }}>
    <Typography variant="body2" noWrap sx={{
      fontWeight: 700
    }}>
      {row.full_name || EM_DASH}
    </Typography>
    <Typography variant="caption" noWrap sx={{
      color: "text.secondary"
    }}>
      {dash(row.email)}
    </Typography>
  </Stack>
);

const renderChips = (values: string[]) => {
  if (values.length === 0) {
    return (
      <Typography variant="body2" sx={{
        color: "text.secondary"
      }}>
        {EM_DASH}
      </Typography>
    );
  }
  return (
    <Stack direction="row" spacing={0.5} useFlexGap sx={{
      flexWrap: "wrap"
    }}>
      {values.map((value) => (
        <Chip key={value} label={value} size="small" variant="outlined" />
      ))}
    </Stack>
  );
};

export const renderRoles = (row: AudienceRow) => renderChips(row.roles);
export const renderPush = (row: AudienceRow) => renderChips(row.push_platforms);
