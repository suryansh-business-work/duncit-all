import { useState } from 'react';
import { Avatar, Stack, Tooltip, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ShareIcon from '@mui/icons-material/Share';
import { DuncitIconButton } from '@duncit/buttons';
import ContentActionsMenu from '../../../components/content-report/ContentActionsMenu';
import ReportContentDialog from '../../../components/content-report/ReportContentDialog';
import { sharePost } from '../../../utils/share';
import { useTranslation } from '../../../i18n/useTranslation';

interface PostDialogHeaderProps {
  post: any;
  /** True for the post's own author — they get Delete, everyone else Report. */
  canDelete: boolean;
  onClose: () => void;
  onRequestDelete: () => void;
}

/**
 * The post dialog's header: who posted it, Share, the 3-dot menu and Close.
 * Native twin: PostViewerHeader (rule 27).
 *
 * The menu holds Delete for the author and Report for everybody else. A report
 * against your own post has nobody to review it, so the two never appear
 * together. The report flow starts and ends here, so its state lives here
 * rather than in the dialog that only hosts this header.
 */
export default function PostDialogHeader({
  post,
  canDelete,
  onClose,
  onRequestDelete,
}: Readonly<PostDialogHeaderProps>) {
  const { t } = useTranslation();
  const [reporting, setReporting] = useState<string | null>(null);
  return (
    <>
      <Stack
        data-testid="post-dialog-header"
        direction="row"
        spacing={1.5}
        sx={{ alignItems: 'center', p: 1.5, borderBottom: 1, borderColor: 'divider' }}
      >
        <Avatar src={post.author?.profile_photo || undefined} alt="" sx={{ width: 32, height: 32 }}>
          {(post.author?.first_name?.[0] ?? 'U').toUpperCase()}
        </Avatar>
        <Typography
          data-testid="post-dialog-header-author"
          id="post-dialog-author"
          variant="subtitle2"
          sx={{ fontWeight: 700, flex: 1 }}
        >
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
        <ContentActionsMenu
          kind="POST"
          tone="surface"
          canDelete={canDelete}
          canReport={!canDelete}
          onDelete={onRequestDelete}
          onReport={() => setReporting(post.id)}
        />
        <DuncitIconButton
          data-testid="post-dialog-header-close"
          size="small"
          onClick={onClose}
          aria-label={t('mweb.common.close')}
        >
          <CloseIcon fontSize="small" />
        </DuncitIconButton>
      </Stack>
      <ReportContentDialog kind="POST" postId={reporting} onClose={() => setReporting(null)} />
    </>
  );
}
