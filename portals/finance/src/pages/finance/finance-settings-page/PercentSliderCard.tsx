import { Box, Card, CardContent, Chip, Slider, Stack, Typography } from '@mui/material';

interface Props {
  title: string;
  helperText: string;
  value: number;
  onChange: (next: number) => void;
  chipColor: 'primary' | 'warning';
  max: number;
  marks: { value: number; label: string }[];
}

export default function PercentSliderCard({
  title,
  helperText,
  value,
  onChange,
  chipColor,
  max,
  marks,
}: Readonly<Props>) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            {title}
          </Typography>
          <Chip color={chipColor} label={`${value}%`} />
        </Stack>
        <Typography variant="caption" color="text.secondary">
          {helperText}
        </Typography>
        <Box sx={{ px: 2, mt: 2 }}>
          <Slider
            value={value}
            onChange={(_, v) => onChange(v as number)}
            min={0}
            max={max}
            step={0.5}
            marks={marks}
            valueLabelDisplay="auto"
            valueLabelFormat={(v) => `${v}%`}
          />
        </Box>
      </CardContent>
    </Card>
  );
}
