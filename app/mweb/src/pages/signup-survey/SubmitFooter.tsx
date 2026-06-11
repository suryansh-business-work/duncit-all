import { Box, Button, Stack, Typography } from '@mui/material';

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
        position: 'sticky',
        bottom: 'calc(64px + env(safe-area-inset-bottom))',
        zIndex: 10,
        mt: 0.5,
        p: 1.25,
        backdropFilter: 'blur(12px)',
        bgcolor: (t) => `${t.palette.background.paper}f2`,
        border: 1,
        borderColor: 'divider',
        borderRadius: 3,
        boxShadow: '0 14px 36px rgba(15, 23, 42, 0.14)',
      }}
    >
      <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        sx={{ width: '100%' }}
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
          {saving ? 'Saving…' : 'Find my crew'}
        </Button>
      </Stack>
    </Box>
  );
}
