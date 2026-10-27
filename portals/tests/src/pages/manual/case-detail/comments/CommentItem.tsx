import { useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { useDateFormat } from '@duncit/app-settings';
import { DuncitIconButton } from '@duncit/buttons';
import { useConfirm } from '@duncit/dialogs';
import { DuncitRichTextInput } from '@duncit/rich-text';
import { useTranslation } from '@duncit/shell';
import { PersonAvatar } from '../../../../components/manual/PersonAvatar';
import type { ManualComment } from '../../shared/types';
import { CommentForm } from './comment';

interface Props {
  comment: ManualComment;
  onEdit: (id: string, body: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}

const IGNORE_CHANGE = () => undefined;

/** One comment: who, when (and whether it was edited), what — editable by its author. */
export function CommentItem({ comment, onEdit, onDelete }: Readonly<Props>) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const format = useDateFormat();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const author = comment.author?.name || t('testsManual.comments.formerStaff');

  const save = async (body: string) => {
    setSaving(true);
    const ok = await onEdit(comment.id, body);
    setSaving(false);
    if (ok) setEditing(false);
    return ok;
  };

  const remove = async () => {
    const ok = await confirm({
      title: t('testsManual.comments.deleteTitle'),
      message: t('testsManual.comments.deleteMessage'),
      confirmLabel: t('shell.common.delete'),
      destructive: true,
    });
    if (ok) await onDelete(comment.id);
  };

  return (
    <Stack component="li" direction="row" spacing={1.5}>
      {comment.author ? <PersonAvatar person={comment.author} size={4} /> : null}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography variant="subtitle2">{author}</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {format.formatDateTime(comment.created_at)}
          </Typography>
          {comment.edited_at ? (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {t('testsManual.comments.edited', { vars: { when: format.formatDateTime(comment.edited_at) } })}
            </Typography>
          ) : null}
          <Box sx={{ flex: 1 }} />
          {comment.can_edit && !editing ? (
            <DuncitIconButton size="small" aria-label={t('testsManual.comments.edit')} onClick={() => setEditing(true)}>
              <EditOutlinedIcon fontSize="small" />
            </DuncitIconButton>
          ) : null}
          {comment.can_delete && !editing ? (
            <DuncitIconButton size="small" aria-label={t('testsManual.comments.delete')} onClick={remove}>
              <DeleteOutlineIcon fontSize="small" />
            </DuncitIconButton>
          ) : null}
        </Stack>
        {editing ? (
          <CommentForm
            initial={comment.body}
            submitLabel={t('shell.common.save')}
            saving={saving}
            onSubmit={save}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <DuncitRichTextInput value={comment.body} onChange={IGNORE_CHANGE} readOnly bare ariaLabel={author} />
        )}
      </Box>
    </Stack>
  );
}
