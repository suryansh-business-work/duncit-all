import {
  Avatar,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { formatRelative } from './helpers';

interface Props {
  comments: any[];
  viewerId?: string | null;
  onDelete: (commentId: string) => void;
}

export default function CommentsList({ comments, viewerId, onDelete }: Props) {
  return (
    <List>
      {comments.map((c: any) => (
        <ListItem
          key={c.id}
          alignItems="flex-start"
          secondaryAction={
            viewerId && c.author_id === viewerId ? (
              <IconButton edge="end" onClick={() => onDelete(c.id)} size="small">
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            ) : null
          }
        >
          <ListItemAvatar>
            <Avatar src={c.author_photo || undefined}>
              {(c.author_name || '?').slice(0, 1).toUpperCase()}
            </Avatar>
          </ListItemAvatar>
          <ListItemText
            primary={
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="subtitle2">{c.author_name || 'Anon'}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatRelative(c.created_at)}
                </Typography>
              </Stack>
            }
            secondary={
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {c.text}
              </Typography>
            }
          />
        </ListItem>
      ))}
    </List>
  );
}
