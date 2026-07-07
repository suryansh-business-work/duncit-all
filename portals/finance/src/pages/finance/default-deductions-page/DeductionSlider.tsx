import { Box, Chip, Slider, Stack, Tooltip, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

interface Props {
  label: string;
  value: number;
  onChange: (next: number) => void;
  hint?: string;
  max?: number;
}

/** A labeled 0–max% MUI slider with a live value chip, used across the Default
 * Deductions cards. An optional `hint` renders an info tooltip on the label. */
export default function DeductionSlider({ label, value, onChange, hint, max = 100 }: Readonly<Props>) {
  return (
    <Box sx={{ flex: 1, minWidth: 220, px: 1 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
        <Tooltip title={hint ?? ''} placement="top" arrow disableHoverListener={!hint}>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Typography variant="body2" fontWeight={600}>
              {label}
            </Typography>
            {hint && <InfoOutlinedIcon fontSize="small" color="action" />}
          </Stack>
        </Tooltip>
        <Chip size="small" color="primary" label={`${value}%`} />
      </Stack>
      <Slider
        value={value}
        onChange={(_, v) => onChange(v as number)}
        min={0}
        max={max}
        step={0.5}
        valueLabelDisplay="auto"
        valueLabelFormat={(v) => `${v}%`}
        aria-label={label}
      />
    </Box>
  );
}
