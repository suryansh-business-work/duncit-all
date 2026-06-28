import { Avatar, Box, CircularProgress, IconButton, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';

interface Props {
  photo?: string | null;
  initial: string;
  size: number;
  hasStory: boolean;
  saving: boolean;
  onAvatarClick: () => void;
  onAddStory: () => void;
  onEdit: (el: HTMLElement) => void;
}

/** The avatar visual (items 9 + 12): story ring + click-to-view/add, a "+" add
 * badge and an edit pencil that opens the photo menu. */
export default function AvatarButton({
  photo,
  initial,
  size,
  hasStory,
  saving,
  onAvatarClick,
  onAddStory,
  onEdit,
}: Readonly<Props>) {
  const ringSx = hasStory
    ? { p: '3px', borderRadius: '50%', background: 'linear-gradient(135deg, #ff8b5f, #ed4f7a)' }
    : {};

  return (
    <Box sx={{ position: 'relative', width: size + 8, height: size + 8 }}>
      <Tooltip title={hasStory ? 'View your story' : 'Add a story'}>
        <Box
          role="button"
          aria-label={hasStory ? 'View your story' : 'Add a story'}
          data-testid="avatar-button"
          onClick={onAvatarClick}
          sx={{ cursor: 'pointer', display: 'inline-flex', ...ringSx }}
        >
          <Avatar
            src={photo || undefined}
            sx={{
              width: size,
              height: size,
              bgcolor: 'primary.main',
              fontSize: size * 0.4,
              border: 2,
              borderColor: 'background.paper',
            }}
          >
            {initial}
          </Avatar>
        </Box>
      </Tooltip>

      <Tooltip title="Add story">
        <IconButton
          size="small"
          data-testid="avatar-add-story"
          aria-label="Add story"
          onClick={onAddStory}
          sx={{
            position: 'absolute',
            left: -2,
            bottom: -2,
            bgcolor: 'primary.main',
            color: 'common.white',
            '&:hover': { bgcolor: 'primary.dark' },
          }}
        >
          <AddIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Tooltip title="Change profile photo">
        <IconButton
          size="small"
          data-testid="avatar-edit"
          aria-label="Edit photo"
          disabled={saving}
          onClick={(e) => onEdit(e.currentTarget)}
          sx={{
            position: 'absolute',
            right: -2,
            bottom: -2,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          {saving ? <CircularProgress size={16} /> : <EditIcon fontSize="small" />}
        </IconButton>
      </Tooltip>
    </Box>
  );
}
