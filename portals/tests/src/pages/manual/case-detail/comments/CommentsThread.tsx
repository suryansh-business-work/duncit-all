import { Divider, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { QueryGuard } from '@duncit/ui';
import { CommentForm } from './comment';
import { CommentItem } from './CommentItem';
import { useComments } from './useComments';

interface Props {
  caseId: string;
}

/** The case's discussion: every comment oldest first, then a box to add one. */
export default function CommentsThread({ caseId }: Readonly<Props>) {
  const { t } = useTranslation();
  const thread = useComments(caseId);
  const remaining = thread.total - thread.rows.length;

  return (
    <Stack spacing={2}>
      <QueryGuard loading={thread.loading} error={thread.rows.length ? undefined : thread.error}>
        {thread.rows.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('testsManual.comments.empty')}
          </Typography>
        ) : (
          <Stack component="ul" spacing={2} divider={<Divider component="li" aria-hidden />} sx={{ listStyle: 'none', p: 0, m: 0 }}>
            {thread.rows.map((comment) => (
              <CommentItem key={comment.id} comment={comment} onEdit={thread.edit} onDelete={thread.remove} />
            ))}
          </Stack>
        )}
        {remaining > 0 ? (
          <DuncitButton size="small" onClick={thread.loadMore} sx={{ alignSelf: 'flex-start' }}>
            {t('testsManual.comments.loadMore', { vars: { count: remaining } })}
          </DuncitButton>
        ) : null}
      </QueryGuard>
      <CommentForm submitLabel={t('testsManual.comments.add')} saving={thread.adding} onSubmit={thread.add} />
    </Stack>
  );
}
