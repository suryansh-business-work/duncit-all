import {
  Avatar,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../i18n/useTranslation';

export interface AttendeePerson {
  user_id: string;
  full_name?: string | null;
  profile_photo?: string | null;
  is_host: boolean;
  /**
   * Seats this person's booking holds. One face per person however many they
   * booked — the group is a label beside their name, never extra avatars, or
   * the same booking is counted twice on screen.
   */
  seats?: number;
}

/** One filled Backout seat, already resolved to display copy by the section —
 * computed once in the parent so both surfaces render identical rows. */
export interface SpotFillRow {
  key: string;
  old_user_id: string;
  old_name: string;
  old_photo: string | null;
  filled_by_label: string;
}

interface Props {
  open: boolean;
  people: AttendeePerson[];
  spotFills?: SpotFillRow[];
  onClose: () => void;
}

/** Full attendees list — photos, host highlight, tap-through to profiles (3).
 * Members whose released seat was rebooked render struck-through with the
 * replacement's name under them. */
export default function PodAttendeesDialog({
  open,
  people,
  spotFills = [],
  onClose,
}: Readonly<Props>) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const openProfile = (userId: string) => {
    onClose();
    navigate(`/u/${userId}`);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', pr: 1 }}>
        <Typography component="span" sx={{ flex: 1, fontWeight: 700 }}>
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
                sx={{ borderRadius: '16px' }}
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
                  primaryTypographyProps={{ fontWeight: person.is_host ? 700 : 600, fontSize: 14 }}
                  secondaryTypographyProps={{ fontSize: 12 }}
                />
                {person.is_host && (
                  <Chip size="small" color="primary" label="Host" sx={{ fontWeight: 700 }} />
                )}
              </ListItemButton>
            ))}
          </List>
        )}
        {spotFills.length > 0 && (
          <>
            <Divider sx={{ my: 1 }} />
            <Typography variant="caption" color="text.secondary" sx={{ px: 2, fontWeight: 600 }}>
              {t('mweb.podDetails.spotFilled')}
            </Typography>
            <List disablePadding>
              {spotFills.map((fill) => (
                <ListItemButton
                  key={fill.key}
                  onClick={() => openProfile(fill.old_user_id)}
                  sx={{ borderRadius: '16px' }}
                >
                  <ListItemAvatar>
                    <Avatar src={fill.old_photo || undefined} sx={{ opacity: 0.6 }}>
                      {fill.old_name.charAt(0).toUpperCase()}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={fill.old_name}
                    secondary={fill.filled_by_label}
                    primaryTypographyProps={{
                      fontSize: 14,
                      sx: { textDecoration: 'line-through', color: 'text.disabled' },
                    }}
                    secondaryTypographyProps={{ fontSize: 12 }}
                  />
                </ListItemButton>
              ))}
            </List>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
