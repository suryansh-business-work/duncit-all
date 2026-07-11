import { Card, CardContent, Stack, Typography } from '@mui/material';
import { AppIcon } from '@duncit/shell';

/** A single KPI tile — icon, big value and a caption (Task B item 5). */
export default function StatTile({
  icon,
  label,
  value,
  hint,
  color = 'text.primary',
}: Readonly<{
  icon: string;
  label: string;
  value: string | number;
  hint?: string;
  color?: string;
}>) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ color: 'text.secondary', mb: 0.5 }}>
          <AppIcon name={icon} fontSize="small" />
          <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>
            {label}
          </Typography>
        </Stack>
        <Typography variant="h4" sx={{ fontWeight: 800, color }}>
          {value}
        </Typography>
        {hint && (
          <Typography variant="caption" color="text.secondary">
            {hint}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
