import { Box, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { ZERO_EARNINGS_BODY, ZERO_EARNINGS_TITLE } from './pricingCopy';

/**
 * Shown under the Ticket Price field when the server projects a take-home of
 * ₹0 or less. Create Pod stays disabled while it is on screen; raising the
 * price clears it automatically. Native twin (rule 27).
 */
export default function ZeroEarningsNotice() {
  const theme = useTheme();
  return (
    <Stack
      direction="row"
      spacing={1}
      alignItems="flex-start"
      role="alert"
      data-testid="create-pod-zero-earnings"
      sx={{
        p: 1.25,
        borderRadius: '16px',
        bgcolor: alpha(theme.palette.warning.main, 0.1),
        border: 1,
        borderColor: alpha(theme.palette.warning.main, 0.4),
      }}
    >
      <InfoOutlinedIcon fontSize="small" color="warning" />
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle2" fontWeight={600}>
          {ZERO_EARNINGS_TITLE}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {ZERO_EARNINGS_BODY}
        </Typography>
      </Box>
    </Stack>
  );
}
