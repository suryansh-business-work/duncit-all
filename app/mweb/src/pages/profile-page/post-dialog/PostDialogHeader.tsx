import { Avatar, Stack, Tooltip, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import ShareIcon from '@mui/icons-material/Share';
import { DuncitIconButton } from '@duncit/buttons';
import { sharePost } from '../../../utils/share';
import { useTranslation } from '../../../i18n/useTranslation';

interface PostDialogHeaderProps {
  post: any;
  canDelete: boolean;
  onClose: () => void;
  onRequestDelete: () => void;
}

export default function PostDialogHeader({
  post,
  canDelete,
  onClose,
  onRequestDelete,
}: Readonly<PostDialogHeaderProps>) {
  const { t } = useTranslation();
  return (
    <Stack
      data-testid="post-dialog-header"
      direction="row"
      spacing={1.5}
      sx={{
        alignItems: "center",
        p: 1.5,
        borderBottom: 1,
        borderColor: 'divider'
      }}>
      <Avatar src={post.author?.profile_photo || undefined} alt="" sx={{ width: 32, height: 32 }}>
        {(post.author?.first_name?.[0] ?? 'U').toUpperCase()}
      </Avatar>
      <Typography
        data-testid="post-dialog-header-author"
        id="post-dialog-author"
        variant="subtitle2"
        sx={{
          fontWeight: 700,
          flex: 1
        }}>
        {post.author?.full_name ?? 'User'}
      </Typography>
      <Tooltip title={t('mweb.profile.sharePost')}>
        <DuncitIconButton
          data-testid="post-dialog-header-share"
          size="small"
          aria-label={t('mweb.profile.sharePost')}
          onClick={() => sharePost(post.id, post.author?.full_name ?? 'Post')}
        >
          <ShareIcon fontSize="small" />
        </DuncitIconButton>
      </Tooltip>
      {canDelete && (
        <Tooltip title={t('mweb.profile.deletePost')}>
          <DuncitIconButton data-testid="post-dialog-header-delete" size="small" onClick={onRequestDelete}>
            <DeleteOutlineIcon fontSize="small" />
          </DuncitIconButton>
        </Tooltip>
      )}
      <DuncitIconButton data-testid="post-dialog-header-close" size="small" onClick={onClose} aria-label={t('mweb.common.close')}>
        <CloseIcon fontSize="small" />
      </DuncitIconButton>
    </Stack>
  );
}
