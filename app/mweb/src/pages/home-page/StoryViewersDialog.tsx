import {
  Avatar,
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useQuery } from '@apollo/client';
import { STORY_VIEWERS } from './queries';

interface StoryViewer {
  user_id: string;
  viewed_at: string;
  user?: { user_id?: string | null; full_name?: string | null; profile_photo?: string | null } | null;
}

/** Owner-only dialog listing who viewed a story, newest first (Bug 4). */
export default function StoryViewersDialog({
  storyId,
  onClose,
}: Readonly<{ storyId: string | null; onClose: () => void }>) {
  const { data, loading } = useQuery(STORY_VIEWERS, {
    variables: { id: storyId },
    skip: !storyId,
    fetchPolicy: 'cache-and-network',
  });
  const viewers: StoryViewer[] = data?.storyViewers ?? [];

  return (
    <Dialog open={!!storyId} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <VisibilityIcon fontSize="small" />
          <Typography component="span" sx={{ fontWeight: 900 }}>
            {viewers.length === 0 ? 'No views yet' : `Seen by ${viewers.length}`}
          </Typography>
        </Stack>
        <IconButton onClick={onClose} aria-label="Close viewers" size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {loading && viewers.length === 0 ? (
          <Box sx={{ py: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Loading…
            </Typography>
          </Box>
        ) : viewers.length === 0 ? (
          <Box sx={{ py: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No one has viewed this story yet.
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {viewers.map((viewer) => (
              <ListItem key={viewer.user_id} disableGutters>
                <ListItemAvatar>
                  <Avatar src={viewer.user?.profile_photo || undefined} />
                </ListItemAvatar>
                <ListItemText primary={viewer.user?.full_name ?? 'Someone'} />
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
}
