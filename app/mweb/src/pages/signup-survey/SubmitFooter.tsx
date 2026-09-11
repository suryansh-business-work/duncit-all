import { Box, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { SURFACE_SX } from '../../theme';

interface Props {
  count: number;
  total: number;
  saving: boolean;
  canSubmit: boolean;
  onSubmit: () => void;
}

export default function SubmitFooter({ count, total, saving, canSubmit, onSubmit }: Readonly<Props>) {
  return (
    <Box
      sx={{
        ...SURFACE_SX,
        // It floats over the white group cards, so it keeps a hairline edge.
        border: 1,
        borderColor: 'divider',
        position: 'sticky',
        bottom: 'calc(64px + env(safe-area-inset-bottom))',
        zIndex: 10,
        mt: 0.5,
        px: 2,
        py: 1.5,
      }}
    >
      <Stack
        direction="row"
        spacing={2}
        sx={{
          alignItems: "center",
          width: '100%'
        }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            Selected
          </Typography>
          <Typography variant="subtitle1" sx={{
            fontWeight: 600
          }}>
            {count}
            <Box component="span" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              {' '}/ {total}
            </Box>
          </Typography>
        </Box>
        <DuncitButton
          variant="contained"
          color="primary"
          size="large"
          disabled={!canSubmit}
          onClick={onSubmit}
          sx={{ minWidth: 160 }}
        >
          {saving ? 'Saving…' : 'Find my crew'}
        </DuncitButton>
      </Stack>
    </Box>
  );
}
