import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { DuncitButton } from '@duncit/buttons';

interface OptionRowProps {
  icon: ReactNode;
  label: string;
  /** What it is set to now, e.g. "Free" or "Unlimited". */
  value?: string;
  /** Opens the editor; the row shows Edit with the label read out. */
  onEdit?: () => void;
  editLabel?: string;
  /** A control in place of the value (a switch). */
  control?: ReactNode;
  testId: string;
}

/** One line of "Event options": icon, name, current value and Edit (or an inline control). */
export function OptionRow({ icon, label, value, onEdit, editLabel, control, testId }: Readonly<OptionRowProps>) {
  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minHeight: 48, px: 1.5, '&:not(:last-of-type)': { borderBottom: 1, borderColor: 'divider' } }} data-testid={testId}>
      <Box aria-hidden sx={{ display: 'flex', color: 'text.secondary' }}>
        {icon}
      </Box>
      <Typography variant="body2" sx={{ fontWeight: 700, flexGrow: 1 }}>
        {label}
      </Typography>
      {control}
      {onEdit ? (
        <DuncitButton
          size="small"
          onClick={onEdit}
          endIcon={<EditOutlinedIcon fontSize="small" />}
          // The visible value leads the name (WCAG 2.5.3), then what pressing it does.
          aria-label={editLabel ? `${value ?? ''}, ${editLabel}` : undefined}
          sx={{ color: 'text.secondary', fontWeight: 600 }}
          data-testid={`${testId}-edit`}
        >
          {value}
        </DuncitButton>
      ) : null}
    </Stack>
  );
}
