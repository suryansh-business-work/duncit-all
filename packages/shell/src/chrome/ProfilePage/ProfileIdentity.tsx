import { Avatar, Box, Stack, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import GoogleIcon from '@mui/icons-material/Google';
import { DuncitButton } from '@duncit/buttons';
import { accountEmail, accountName, initials, type ShellUser } from '../user-display';

interface Props {
  user: ShellUser;
  /** The Gmail that also opens this account, when one is linked. */
  googleEmail: string | null;
  /** The product name from branding, read by the page that owns the query. */
  appName: string;
  editing: boolean;
  onEdit: () => void;
}

/** Who is signed in: avatar, name, e-mail, linked Gmail — and the way into editing. */
export function ProfileIdentity({ user, googleEmail, appName, editing, onEdit }: Readonly<Props>) {
  const name = accountName(user, 'User');
  const email = accountEmail(user);

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{
      alignItems: { xs: 'flex-start', sm: 'center' }
    }}>
      <Avatar
        src={user?.profile_photo || undefined}
        alt=""
        sx={{ width: 72, height: 72, bgcolor: 'primary.main', fontSize: 28, fontWeight: 800 }}
      >
        {initials(user, 'U')}
      </Avatar>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="h6" noWrap sx={{
          fontWeight: 800
        }}>
          {name}
        </Typography>
        <Typography noWrap sx={{
          color: "text.secondary"
        }}>
          {email || '—'}
        </Typography>
        {/* Read-only on purpose: the consoles sign in with a password or an
            emailed code, never with Google, so there is nothing to connect
            here. What the line answers is "which Gmail also opens this
            account", which mWeb and the app can grant. */}
        {googleEmail && (
          <Stack
            direction="row"
            spacing={0.5}
            sx={{
              alignItems: "center",
              minWidth: 0
            }}>
            <GoogleIcon sx={{ fontSize: 14, color: '#4285f4' }} />
            <Typography variant="caption" noWrap sx={{
              color: "text.secondary"
            }}>
              {googleEmail}
            </Typography>
          </Stack>
        )}
        <Typography variant="caption" sx={{
          color: "text.secondary"
        }}>
          Signed in to {appName}
        </Typography>
      </Box>
      {!editing && (
        <DuncitButton data-testid="account-edit" size="small" startIcon={<EditIcon />} onClick={onEdit} sx={{ fontWeight: 800 }}>
          Edit
        </DuncitButton>
      )}
    </Stack>
  );
}
