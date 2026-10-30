import { Alert, Avatar, Box, CircularProgress, Drawer, IconButton, List, ListItem, ListItemAvatar, ListItemText, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitButton } from '@duncit/buttons';
import { useConfirm } from '@duncit/dialogs';
import { logs } from '@duncit/logs';
import { notifyError, notifySuccess } from '../../components/notify';
import { useTranslation } from '../../i18n/useTranslation';
import { formatDateTime } from '../../utils/dateFormat';
import { LearningCommentForm } from './learning-comment-form';
import { useLearningComments } from './useLearningComments';
import type { LearningCard, LearningComment } from './queries';

interface Props {
  card: LearningCard | null;
  onClose: () => void;
  /** Keeps the card's comment count in step with what was posted or removed. */
  onCountChange: (card: LearningCard, delta: number) => void;
}

/** Bottom sheet with a Learnings video's comments and the box to add one. Native twin: TutorialCommentsSheet. */
export default function LearningCommentsDrawer({ card, onClose, onCountChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const comments = useLearningComments(card?.id ?? null);

  const add = async (text: string) => {
    if (!card) return;
    await comments.add(text);
    onCountChange(card, 1);
  };

  const remove = async (comment: LearningComment) => {
    if (!card) return;
    const ok = await confirm({
      title: t('mweb.tutorials.deleteConfirmTitle'),
      message: t('mweb.tutorials.deleteConfirmBody'),
      confirmLabel: t('mweb.tutorials.deleteConfirm'),
      cancelLabel: t('mweb.tutorials.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await comments.remove(comment.id);
      onCountChange(card, -1);
      notifySuccess(t('mweb.tutorials.commentDeleted'));
    } catch (error) {
      logs.mWeb.warn('LearningsPage', 'deleteComment', { error });
      notifyError(t('mweb.tutorials.commentDeleteFailed'));
    }
  };

  const renderRow = (comment: LearningComment) => (
    <ListItem
      key={comment.id}
      alignItems="flex-start"
      data-testid={`learning-comment-${comment.id}`}
      secondaryAction={
        comment.is_mine ? (
          <IconButton edge="end" aria-label={t('mweb.tutorials.commentDelete')} onClick={() => { remove(comment).catch(() => undefined); }}>
            <DeleteOutlineIcon />
          </IconButton>
        ) : undefined
      }
    >
      <ListItemAvatar>
        <Avatar src={comment.author?.profile_photo ?? undefined} alt="" />
      </ListItemAvatar>
      <ListItemText
        primary={comment.author?.full_name || t('mweb.tutorials.member')}
        secondary={
          <>
            <Typography component="span" variant="body2" sx={{ display: 'block', color: 'text.primary', whiteSpace: 'pre-wrap' }}>
              {comment.text}
            </Typography>
            <Typography component="span" variant="caption">{formatDateTime(comment.created_at)}</Typography>
          </>
        }
      />
    </ListItem>
  );

  return (
    <Drawer anchor="bottom" open={card !== null} onClose={onClose} slotProps={{ paper: { sx: { maxHeight: '80dvh', borderTopLeftRadius: 16, borderTopRightRadius: 16 } } }}>
      <Stack sx={{ p: 2, gap: 1.5 }} role="dialog" aria-labelledby="learning-comments-title" data-testid="learning-comments">
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography id="learning-comments-title" variant="h6" component="h2">
            {t('mweb.tutorials.commentsTitle')}
          </Typography>
          <IconButton aria-label={t('mweb.tutorials.close')} onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Stack>
        <Box sx={{ overflowY: 'auto', minHeight: 120 }} aria-live="polite">
          {comments.failed && (
            <Alert severity="error" action={<DuncitButton size="small" onClick={() => { comments.retry().catch(() => undefined); }}>{t('mweb.tutorials.retry')}</DuncitButton>}>
              {t('mweb.tutorials.commentsLoadFailed')}
            </Alert>
          )}
          {!comments.failed && !comments.loading && comments.rows.length === 0 && (
            <Typography sx={{ color: 'text.secondary', py: 3, textAlign: 'center' }}>{t('mweb.tutorials.commentsEmpty')}</Typography>
          )}
          <List dense disablePadding>{comments.rows.map(renderRow)}</List>
          {comments.loading && (
            <Stack sx={{ alignItems: 'center', py: 2 }}>
              <CircularProgress size={24} aria-label={t('mweb.a11y.loading')} />
            </Stack>
          )}
          {comments.hasMore && !comments.loading && (
            <DuncitButton fullWidth onClick={() => { comments.loadMore().catch(() => undefined); }}>
              {t('mweb.tutorials.loadMoreComments')}
            </DuncitButton>
          )}
        </Box>
        <LearningCommentForm onSubmit={add} />
      </Stack>
    </Drawer>
  );
}
