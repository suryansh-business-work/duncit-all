import {
  Avatar,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useNavigate } from 'react-router-dom';

export interface AttendeePerson {
  user_id: string;
  full_name?: string | null;
  profile_photo?: string | null;
  is_host: boolean;
}

interface Props {
  open: boolean;
  people: AttendeePerson[];
  onClose: () => void;
}

/** Full attendees list — photos, host highlight, tap-through to profiles (3). */
export default function PodAttendeesDialog({ open, people, onClose }: Readonly<Props>) {
  const navigate = useNavigate();

  const openProfile = (userId: string) => {
    onClose();
    navigate(`/u/${userId}`);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 900, display: 'flex', alignItems: 'center', pr: 1 }}>
        <Typography component="span" sx={{ flex: 1, fontWeight: 900 }}>
          Attendees ({people.length})
        </Typography>
        <IconButton size="small" aria-label="Close attendees" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 1 }}>
        {people.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
            No attendees yet.
          </Typography>
        ) : (
          <List disablePadding>
            {people.map((person) => (
              <ListItemButton
                key={person.user_id}
                onClick={() => openProfile(person.user_id)}
                sx={{ borderRadius: 2.5 }}
              >
                <ListItemAvatar>
                  <Avatar
                    src={person.profile_photo || undefined}
                    sx={{
                      bgcolor: 'primary.main',
                      border: person.is_host ? 2 : 0,
                      borderColor: 'primary.main',
                      boxShadow: person.is_host ? '0 0 0 3px rgba(255,79,115,0.24)' : 'none',
                    }}
                  >
                    {(person.full_name?.[0] ?? '?').toUpperCase()}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={person.full_name || 'Attendee'}
                  secondary="View profile"
                  primaryTypographyProps={{ fontWeight: person.is_host ? 800 : 600, fontSize: 14 }}
                  secondaryTypographyProps={{ fontSize: 12 }}
                />
                {person.is_host && (
                  <Chip size="small" color="primary" label="Host" sx={{ fontWeight: 900 }} />
                )}
              </ListItemButton>
            ))}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
}
