import { Card, CardContent, Chip, Stack, Typography } from '@mui/material';

interface Props {
  user: any;
}

export default function PermissionsSection({ user }: Props) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="subtitle1" gutterBottom>
          Effective Permissions
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Computed from the user's assigned roles.
        </Typography>
        {(user.permissions ?? []).length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No permissions.
          </Typography>
        ) : (
          <Stack direction="row" sx={{ gap: 1 }} flexWrap="wrap">
            {user.permissions.map((p: string) => (
              <Chip key={p} label={p} size="small" variant="outlined" />
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
