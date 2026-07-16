import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import { STATUS_FILTERS, type AdStoredStatus } from './helpers';

interface Props {
  status: '' | AdStoredStatus;
  onChange: (value: '' | AdStoredStatus) => void;
}

export default function AdsApprovalsToolbar({ status, onChange }: Readonly<Props>) {
  return (
    <ToggleButtonGroup
      size="small"
      exclusive
      value={status}
      onChange={(_e, value) => {
        if (value !== null) onChange(value as '' | AdStoredStatus);
      }}
      aria-label="Filter by status"
    >
      {STATUS_FILTERS.map((f) => (
        <ToggleButton key={f.label} value={f.value}>
          {f.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
