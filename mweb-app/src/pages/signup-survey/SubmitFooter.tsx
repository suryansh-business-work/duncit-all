import { Box, Button, Stack, Typography } from '@mui/material';

interface Props {
  count: number;
  total: number;
  saving: boolean;
  canSubmit: boolean;
  onSubmit: () => void;
}

export default function SubmitFooter({ count, total, saving, canSubmit, onSubmit }: Props) {
  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 'calc(56px + env(safe-area-inset-bottom))',
        left: 0,
        right: 0,
        zIndex: 10,
        px: 2,
        py: 1.5,
        backdropFilter: 'blur(12px)',
        bgcolor: (t) => `${t.palette.background.paper}cc`,
        borderTop: 1,
        borderColor: 'divider',
      }}
    >
      <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        sx={{ maxWidth: 760, mx: 'auto', width: '100%' }}
      >
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Selected
          </Typography>
          <Typography variant="subtitle1" fontWeight={800}>
            {count}
            <Box component="span" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              {' '}/ {total}
            </Box>
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          size="large"
          disabled={!canSubmit}
          onClick={onSubmit}
          sx={{ minWidth: 160, fontWeight: 800 }}
        >
          {saving ? 'Saving…' : "Let's Go!"}
        </Button>
      </Stack>
    </Box>
  );
}
