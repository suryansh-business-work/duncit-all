import { Card, CardContent, Skeleton, Stack, Typography } from '@mui/material';
import AppIcon from '../../../components/AppIcon';

interface Props {
  label: string;
  value: string;
  hint?: string;
  icon: string;
  color?: 'primary' | 'success' | 'warning' | 'info' | 'error';
  loading?: boolean;
}

export default function StatCard({ label, value, hint, icon, color = 'primary', loading }: Props) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3, flex: '1 1 220px', minWidth: 220 }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="overline" color="text.secondary">
            {label}
          </Typography>
          <AppIcon name={icon} fontSize="small" color={color} />
        </Stack>
        {loading ? (
          <Skeleton variant="text" width={90} height={40} />
        ) : (
          <Typography variant="h5" fontWeight={800}>
            {value}
          </Typography>
        )}
        {hint && (
          <Typography variant="caption" color="text.secondary">
            {hint}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
