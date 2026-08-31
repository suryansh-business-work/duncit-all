import type { ReactNode } from 'react';
import { useQuery } from '@apollo/client/react';
import { useNavigate } from 'react-router-dom';
import {
  Avatar,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitIconButton } from '@duncit/buttons';
import { POD_LIKERS } from './queries';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  open: boolean;
  onClose: () => void;
  userIds: string[];
}

/** "Who liked this pod" — tap the like count to see likers, tap a person to open
 * their profile (explore item 8). */
export default function LikesListDialog({ open, onClose, userIds }: Readonly<Props>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, loading } = useQuery<any>(POD_LIKERS, {
    variables: { ids: userIds },
    skip: !open || userIds.length === 0,
    fetchPolicy: 'cache-and-network',
  });
  const users: any[] = data?.publicUsersByIds ?? [];

  const openProfile = (userId: string) => {
    onClose();
    navigate(`/u/${userId}`);
  };

  let body: ReactNode;
  if (loading && users.length === 0) {
    body = (
      <Stack
        sx={{
          alignItems: "center",
          py: 4
        }}>
        <CircularProgress size={22} />
      </Stack>
    );
  } else if (userIds.length === 0) {
    body = (
      <Typography
        sx={{
          color: "text.secondary",
          px: 3,
          pb: 3
        }}>
        No likes yet.
      </Typography>
    );
  } else {
    body = (
      <List sx={{ pb: 2 }}>
        {users.map((u) => (
          <ListItemButton key={u.user_id} onClick={() => openProfile(u.user_id)}>
            <ListItemAvatar>
              <Avatar src={u.profile_photo || undefined}>
                {(u.full_name || u.first_name || '?').slice(0, 1).toUpperCase()}
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={u.full_name || u.first_name || 'User'}
              secondary={u.username ? `@${u.username}` : undefined}
              slotProps={{
                primary: { sx: { fontWeight: 600 } }
              }}
            />
          </ListItemButton>
        ))}
      </List>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" slotProps={{
      paper: { sx: { borderRadius: '16px' } }
    }}>
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          pr: 1
        }}>
        <DialogTitle sx={{ fontWeight: 700 }}>{t('mweb.explore.likedBy')}</DialogTitle>
        <DuncitIconButton aria-label={t('mweb.common.close')} onClick={onClose}>
          <CloseIcon />
        </DuncitIconButton>
      </Stack>
      {/* The LIST is the scroll area, not the paper — otherwise "Liked by" and
          its close button scroll away with it on a popular pod. */}
      <DialogContent dividers sx={{ p: 0 }}>
        {body}
      </DialogContent>
    </Dialog>
  );
}
