import { Avatar, Badge, List, ListItemAvatar, ListItemButton, ListItemText, Stack, Typography } from '@mui/material';

/** One venue booking chat as an inbox row (the `VenueChatThread` GraphQL shape). */
export interface VenueChatThreadListRow {
  pod_id: string;
  pod_title: string;
  venue_name: string;
  host_name: string;
  host_photo?: string | null;
  last_message?: string | null;
  last_message_is_photo: boolean;
  last_message_at?: string | null;
  unread_count: number;
}

export interface VenueChatThreadListProps {
  rows: readonly VenueChatThreadListRow[];
  onOpen: (podId: string) => void;
  /** Each surface's own words — this list draws no copy of its own. */
  labels: {
    empty: string;
    photo: string;
    noMessagesYet: string;
    unread: (count: number) => string;
  };
  /** The caller's date formatter for the newest line's time. */
  formatWhen: (iso: string) => string;
  /** Shows each row's venue — for a list spanning several venues. */
  showVenue?: boolean;
}

function previewOf(row: VenueChatThreadListRow, labels: VenueChatThreadListProps['labels']) {
  if (row.last_message_is_photo) return labels.photo;
  return row.last_message || labels.noMessagesYet;
}

/**
 * The venue chat inbox shared by the Partners console, mWeb and the Venues
 * console: one row per pod at the venue, newest activity first (the server
 * orders it). A row opens the thread through `onOpen`.
 */
export function VenueChatThreadList({ rows, onOpen, labels, formatWhen, showVenue = false }: Readonly<VenueChatThreadListProps>) {
  if (rows.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary', py: 3, textAlign: 'center' }}>
        {labels.empty}
      </Typography>
    );
  }
  return (
    <List disablePadding>
      {rows.map((row) => {
        const unread = row.unread_count > 0;
        const title = showVenue ? `${row.pod_title} · ${row.venue_name}` : row.pod_title;
        return (
          <ListItemButton key={row.pod_id} onClick={() => onOpen(row.pod_id)} divider>
            <ListItemAvatar>
              <Badge color="primary" variant="dot" invisible={!unread} overlap="circular">
                <Avatar src={row.host_photo ?? undefined} alt={row.host_name} />
              </Badge>
            </ListItemAvatar>
            <ListItemText
              primary={title}
              secondary={`${row.host_name} · ${previewOf(row, labels)}`}
              slotProps={{
                primary: { noWrap: true, sx: { fontWeight: unread ? 700 : 500 } },
                secondary: { noWrap: true },
              }}
            />
            <Stack sx={{ alignItems: 'flex-end', ml: 1, flexShrink: 0 }}>
              {row.last_message_at && (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {formatWhen(row.last_message_at)}
                </Typography>
              )}
              {unread && (
                <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 700 }}>
                  {labels.unread(row.unread_count)}
                </Typography>
              )}
            </Stack>
          </ListItemButton>
        );
      })}
    </List>
  );
}
