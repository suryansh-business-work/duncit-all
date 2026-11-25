import { Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import type { SocialPublishTarget } from '../publish.queries';

/**
 * What a post's card says beneath its networks: why one refused it, why one
 * is waiting to be tried again (a passing failure the publisher retries on
 * its own), and why a published Instagram post went without its first comment.
 */
export default function TargetNotes({ targets }: Readonly<{ targets: readonly SocialPublishTarget[] }>) {
  const { t } = useTranslation();
  const lines = targets.flatMap((target) => {
    const notes: { key: string; text: string; color: string }[] = [];
    if (target.status === 'FAILED' && target.error) notes.push({ key: 'failed', text: `${target.account_name}: ${target.error}`, color: 'error.main' });
    if (target.status === 'PENDING' && target.error) {
      notes.push({ key: 'retry', text: t('marketing.social.targetRetrying', { vars: { account: target.account_name, reason: target.error } }), color: 'warning.main' });
    }
    if (target.first_comment_error) {
      notes.push({
        key: 'comment',
        text: t('marketing.social.firstCommentFailed', { vars: { account: target.account_name, reason: target.first_comment_error } }),
        color: 'warning.main',
      });
    }
    return notes.map((note) => ({ ...note, key: `${target.account_id}-${note.key}` }));
  });
  return (
    <>
      {lines.map((line) => (
        <Typography key={line.key} variant="caption" component="p" sx={{ color: line.color, mt: 0.5 }} data-testid={`social-post-note-${line.key}`}>
          {line.text}
        </Typography>
      ))}
    </>
  );
}
