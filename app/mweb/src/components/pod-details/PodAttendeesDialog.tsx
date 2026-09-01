import {
  Avatar,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitIconButton } from '@duncit/buttons';
import { attendeeSeatCount } from '@duncit/utils';
import { useNavigate } from 'react-router';
import { useTranslation } from '../../i18n/useTranslation';

type Translate = (key: string, options?: { vars?: Record<string, string | number> }) => string;

/**
 * "+3 other members" — the people a booking covers who are not on the app.
 *
 * The list renders one face per person however many seats they hold, so this
 * label is the only place the rest of their party is visible. Rendering an
 * avatar each would count the same booking twice on screen.
 */
export function otherMembersLabel(seats: number, t: Translate): string {
  const others = Math.max(0, Math.floor(seats) - 1);
  if (others === 1) return t('mweb.podDetails.otherMembersOne');
  return t('mweb.podDetails.otherMembersMany', { vars: { count: others } });
}

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
  /**
   * Seats the list holds, resolved by the section that owns the pod. The
   * heading counts PEOPLE COMING, not rows: a booking for three is one row
   * carrying a "+2 other members" label. Absent (the club members list) the
   * rows are the count.
   */
  seatCount?: number;
  onClose: () => void;
}

/** Full attendees list — photos, host highlight, tap-through to profiles (3).
 * Members whose released seat was rebooked render struck-through with the
 * replacement's name under them. */
export default function PodAttendeesDialog({
  open,
  people,
  spotFills = [],
  seatCount,
  onClose,
}: Readonly<Props>) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const count = seatCount ?? attendeeSeatCount(people);

  const openProfile = (userId: string) => {
    onClose();
    navigate(`/u/${userId}`);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', pr: 1 }}>
        <Typography component="span" sx={{ flex: 1, fontWeight: 700 }}>
          {t('mweb.podDetails.attendeesCount', { vars: { count } })}
        </Typography>
        <DuncitIconButton
          size="small"
          aria-label={t('mweb.podDetails.closeAttendees')}
          onClick={onClose}
        >
          <CloseIcon fontSize="small" />
        </DuncitIconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 1 }}>
        {people.length === 0 ? (
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              p: 2
            }}>
            {t('mweb.podDetails.noAttendeesYet')}
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
                  primary={
                    <>
                      {person.full_name || t('mweb.podDetails.attendee')}
                      {(person.seats ?? 1) > 1 && (
                        <Typography
                          component="span"
                          variant="caption"
                          sx={{
                            color: "text.secondary",
                            ml: 0.75
                          }}>
                          {otherMembersLabel(person.seats ?? 1, t)}
                        </Typography>
                      )}
                    </>
                  }
                  secondary={t('mweb.podDetails.viewProfile')}
                  slotProps={{
                    primary: { sx: { fontWeight: person.is_host ? 700 : 600, fontSize: 14 } },
                    secondary: { sx: { fontSize: 12 } }
                  }} />
                {person.is_host && (
                  <Chip
                    size="small"
                    color="primary"
                    label={t('mweb.podDetails.host')}
                    sx={{ fontWeight: 700 }}
                  />
                )}
              </ListItemButton>
            ))}
          </List>
        )}
        {spotFills.length > 0 && (
          <>
            <Divider sx={{ my: 1 }} />
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                px: 2,
                fontWeight: 600
              }}>
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
                    slotProps={{
                      primary: { sx: { fontSize: 14, textDecoration: 'line-through', color: 'text.disabled' } },

                      secondary: { sx: { fontSize: 12 } }
                    }} />
                </ListItemButton>
              ))}
            </List>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
