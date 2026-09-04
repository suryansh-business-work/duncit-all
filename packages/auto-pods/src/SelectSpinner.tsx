import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

export interface SelectSpinnerProps {
  busy: boolean;
}

/**
 * The small spinner a picker wears while its options are still being read.
 *
 * A select that is only `disabled` mid-load is indistinguishable from one with
 * nothing to offer, which is exactly the wrong thing to tell a venue owner
 * looking for their venue. Sits inside the field, clear of the dropdown arrow.
 */
export function SelectSpinner({ busy }: Readonly<SelectSpinnerProps>) {
  if (!busy) return null;
  return (
    <Box sx={{ display: 'flex', mr: 3 }} data-testid="auto-pod-select-loading">
      <CircularProgress size={16} />
    </Box>
  );
}
