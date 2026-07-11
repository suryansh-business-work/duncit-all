import { Link as RouterLink } from 'react-router-dom';
import { Card, CardActionArea, CardContent, Skeleton, Stack, Typography } from '@mui/material';
import { AppIcon } from '@duncit/shell';

interface Props {
  label: string;
  value: number;
  hint?: string;
  icon: string;
  to: string;
  loading?: boolean;
}

export default function StatCard({ label, value, hint, icon, to, loading }: Readonly<Props>) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3, flex: '1 1 200px', minWidth: 200 }}>
      <CardActionArea component={RouterLink} to={to} sx={{ height: '100%' }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="overline" color="text.secondary">
              {label}
            </Typography>
            <AppIcon name={icon} fontSize="small" color="primary" />
          </Stack>
          {loading ? (
            <Skeleton variant="text" width={60} height={48} />
          ) : (
            <Typography variant="h4" fontWeight={800}>
              {value}
            </Typography>
          )}
          {hint && (
            <Typography variant="caption" color="text.secondary">
              {hint}
            </Typography>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
