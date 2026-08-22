import { Alert, Box, Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import { useTranslation } from '@duncit/shell';

interface Props {
  user: any;
  roleByKey: Record<string, any>;
  onManageRoles: () => void;
}

export default function RolesSection({ user, roleByKey, onManageRoles }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 2 }}
        >
          <Box>
            <Typography variant="subtitle1">{t('admin.roles.title')}</Typography>
            <Typography variant="body2" color="text.secondary">
              Roles determine what this user can do.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<ManageAccountsIcon />}
            onClick={onManageRoles}
          >
            Manage Roles
          </Button>
        </Stack>
        {(user.roles ?? []).length === 0 ? (
          <Alert severity="warning">{t('admin.roles.empty')}</Alert>
        ) : (
          <Stack direction="row" sx={{ gap: 1 }} flexWrap="wrap">
            {user.roles.map((r: string) => (
              <Chip
                key={r}
                label={roleByKey[r]?.name ?? r}
                color="primary"
                variant="outlined"
              />
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
