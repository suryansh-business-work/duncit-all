import { Link as RouterLink } from 'react-router';
import {
  Avatar,
  Card,
  CardContent,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import type { ClubActor } from './types';

interface Props {
  admins: ClubActor[];
  /** Where an admin's name opens — their full Club Admin record. An admin
   * without one stays a plain row rather than a link to a page that cannot load. */
  adminPath?: (admin: ClubActor) => string | undefined;
}

function AdminIdentity({ admin }: Readonly<{ admin: ClubActor }>) {
  return (
    <>
      <ListItemAvatar>
        <Avatar src={admin.avatar_url ?? undefined}>
          {(admin.name || '?').charAt(0).toUpperCase()}
        </Avatar>
      </ListItemAvatar>
      <ListItemText primary={admin.name} slotProps={{
        primary: { sx: { fontWeight: 700 } }
      }} />
    </>
  );
}

function AdminRow({ admin, to }: Readonly<{ admin: ClubActor; to?: string }>) {
  if (to) {
    return (
      <ListItem disablePadding>
        <ListItemButton component={RouterLink} to={to} sx={{ borderRadius: 2, px: 1 }}>
          <AdminIdentity admin={admin} />
        </ListItemButton>
      </ListItem>
    );
  }
  return (
    <ListItem disableGutters>
      <AdminIdentity admin={admin} />
    </ListItem>
  );
}

/** Right/left column: users assigned to administer this club. */
export default function ClubAdminsCard({ admins, adminPath }: Readonly<Props>) {
  return (
    <Card>
      <CardContent>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: "center",
            mb: 1
          }}>
          <AdminPanelSettingsIcon color="primary" />
          <Typography variant="subtitle1" sx={{
            fontWeight: 900
          }}>
            Club Admins
          </Typography>
          <Chip size="small" label={admins.length} sx={{ ml: 0.5 }} />
        </Stack>
        <Divider />

        {admins.length === 0 ? (
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              pt: 2
            }}>
            No club admins assigned yet.
          </Typography>
        ) : (
          <List dense disablePadding>
            {admins.map((admin) => (
              <AdminRow key={admin.id} admin={admin} to={adminPath?.(admin)} />
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
}
