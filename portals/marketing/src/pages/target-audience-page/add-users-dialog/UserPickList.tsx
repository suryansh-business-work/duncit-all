import {
  Checkbox,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import type { PickableUser } from './types';

interface Props {
  users: PickableUser[];
  /** Ids ticked so far — kept by the dialog, so a tick survives a new search. */
  selected: ReadonlySet<string>;
  onToggle: (user: PickableUser) => void;
  loading: boolean;
  emptyText: string;
}

/** Somebody's contact line: whichever of email and phone the account has. */
const contactLine = (user: PickableUser) =>
  [user.email, user.phone].filter(Boolean).join(' · ');

/** The tickable people inside the Add-user dialog. Presentational on purpose —
 * every piece of state it renders is owned by the dialog above it. */
export default function UserPickList({
  users,
  selected,
  onToggle,
  loading,
  emptyText,
}: Readonly<Props>) {
  if (loading && users.length === 0) {
    return (
      <Stack spacing={1} sx={{ p: 1 }}>
        {['a', 'b', 'c', 'd', 'e'].map((key) => (
          <Skeleton key={key} variant="rounded" height={48} />
        ))}
      </Stack>
    );
  }

  if (users.length === 0) {
    return (
      <Typography
        variant="body2"
        sx={{
          color: "text.secondary",
          p: 3,
          textAlign: 'center'
        }}>
        {emptyText}
      </Typography>
    );
  }

  return (
    <List dense disablePadding>
      {users.map((user) => {
        const labelId = `add-user-${user.id}`;
        return (
          <ListItem key={user.id} disablePadding>
            <ListItemButton onClick={() => onToggle(user)} dense>
              <ListItemIcon sx={{ minWidth: 40 }}>
                <Checkbox
                  edge="start"
                  checked={selected.has(user.id)}
                  tabIndex={-1}
                  disableRipple
                  slotProps={{
                    input: { 'aria-labelledby': labelId }
                  }}
                />
              </ListItemIcon>
              <ListItemText
                id={labelId}
                primary={user.full_name}
                secondary={contactLine(user)}
                slotProps={{
                  primary: { sx: { fontWeight: 600 } }
                }}
              />
            </ListItemButton>
          </ListItem>
        );
      })}
    </List>
  );
}
