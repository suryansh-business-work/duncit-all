import { Box, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitRoundButton, type RoundButtonTone } from '@duncit/buttons';

export interface RoundMock {
  label: string;
  tone: RoundButtonTone;
  thumbnail: number;
}

/** Hoisted for the same reason as `ButtonStage`. */
export function RoundStage({ mock }: Readonly<{ mock: RoundMock }>) {
  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        {(['small', 'medium', 'large'] as const).map((size) => (
          <DuncitRoundButton key={size} size={size} tone={mock.tone} aria-label={`Close ${size}`}>
            <CloseIcon />
          </DuncitRoundButton>
        ))}
        <Typography variant="body2" noWrap>
          24px · 36px · 44px
        </Typography>
      </Stack>
      <Box
        sx={{
          position: 'relative',
          width: mock.thumbnail,
          height: mock.thumbnail,
          borderRadius: '16px',
          bgcolor: 'action.hover',
          border: 1,
          borderColor: 'divider',
        }}
      >
        <DuncitRoundButton
          size="small"
          tone={mock.tone}
          aria-label="Remove pod media"
          sx={{ position: 'absolute', top: 2, right: 2 }}
        >
          <CloseIcon />
        </DuncitRoundButton>
      </Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0 }}>
          {mock.label}
        </Typography>
        <DuncitRoundButton tone={mock.tone} aria-label="Close sheet">
          <CloseIcon />
        </DuncitRoundButton>
      </Stack>
    </Stack>
  );
}
