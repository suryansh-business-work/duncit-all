import { Box, Chip, DialogTitle, Stack } from '@mui/material';

interface Props {
  title: string;
  alreadySigned: boolean;
  statusLabel: string;
}

/** Record title with its signed / unsigned chip. */
export function SignWorkflowTitle({ title, alreadySigned, statusLabel }: Readonly<Props>) {
  return (
    <DialogTitle>
      <Stack direction="row" spacing={1.5} sx={{
        alignItems: "center"
      }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>{title}</Box>
        <Chip
          size="small"
          color={alreadySigned ? 'success' : 'default'}
          variant={alreadySigned ? 'filled' : 'outlined'}
          label={statusLabel}
        />
      </Stack>
    </DialogTitle>
  );
}
