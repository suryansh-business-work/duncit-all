import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import { STATUS_FILTERS, type ApprovalStatus } from './helpers';

interface Props {
  status: '' | ApprovalStatus;
  onChange: (value: '' | ApprovalStatus) => void;
}

export default function ApprovalsToolbar({ status, onChange }: Readonly<Props>) {
  return (
    <ToggleButtonGroup
      size="small"
      exclusive
      value={status}
      onChange={(_e, value) => {
        if (value !== null) onChange(value as '' | ApprovalStatus);
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
