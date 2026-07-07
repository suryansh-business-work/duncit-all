import { Avatar, Card, CardContent, Chip, Divider, List, ListItem, ListItemAvatar, ListItemText, Stack, Typography } from '@mui/material';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import type { ClubActor } from './types';

/** Right/left column: users assigned to administer this club. */
export default function ClubAdminsCard({ admins }: Readonly<{ admins: ClubActor[] }>) {
  return (
    <Card>
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <AdminPanelSettingsIcon color="primary" />
          <Typography variant="subtitle1" fontWeight={900}>
            Club Admins
          </Typography>
          <Chip size="small" label={admins.length} sx={{ ml: 0.5 }} />
        </Stack>
        <Divider />

        {admins.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ pt: 2 }}>
            No club admins assigned yet.
          </Typography>
        ) : (
          <List dense disablePadding>
            {admins.map((admin) => (
              <ListItem key={admin.id} disableGutters>
                <ListItemAvatar>
                  <Avatar src={admin.avatar_url ?? undefined}>
                    {(admin.name || '?').charAt(0).toUpperCase()}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText primary={admin.name} primaryTypographyProps={{ fontWeight: 700 }} />
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
}
