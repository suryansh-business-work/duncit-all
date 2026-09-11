import { useState } from 'react';
import { notifyError } from '../../components/notify';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitIconButton } from '@duncit/buttons';
import {
  POD_IDEA_DETAILS,
  ADD_COMMENT,
  DELETE_COMMENT,
  TOGGLE_LIKE,
} from './queries';
import IdeaDetailsBody from './IdeaDetailsBody';
import { useTranslation } from '../../i18n/useTranslation';

interface DetailsProps {
  id: string;
  myId?: string;
  onClose: () => void;
  onChanged: () => void;
}

export default function IdeaDetailsDialog({ id, myId, onClose, onChanged }: Readonly<DetailsProps>) {
  const { t } = useTranslation();
  const { data, loading, refetch } = useQuery<any>(POD_IDEA_DETAILS, {
    variables: { id },
    fetchPolicy: 'cache-and-network',
  });
  const idea = data?.podIdea;
  const [text, setText] = useState('');
  const [addCommentMut, { loading: posting }] = useMutation<any>(ADD_COMMENT);
  const [deleteCommentMut] = useMutation<any>(DELETE_COMMENT);
  const [toggleLikeMut] = useMutation<any>(TOGGLE_LIKE);

  const submit = async () => {
    const t = text.trim();
    if (!t) return;
    try {
      await addCommentMut({ variables: { id, text: t } });
      setText('');
      await refetch();
      onChanged();
    } catch (e: any) {
      notifyError(e.message);
    }
  };

  const onDeleteComment = async (commentId: string) => {
    await deleteCommentMut({ variables: { id, commentId } });
    await refetch();
    onChanged();
  };

  const onToggleLike = async () => {
    await toggleLikeMut({ variables: { id } });
    await refetch();
    onChanged();
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pr: 8, fontSize: '1.0625rem', fontWeight: 600 }}>
        {idea?.title ?? 'Pod idea'}
        <DuncitIconButton
          onClick={onClose}
          aria-label={t('mweb.common.close')}
          sx={{ position: 'absolute', right: 12, top: 12, width: 40, height: 40, minHeight: 40, bgcolor: 'action.hover' }}
        >
          <CloseIcon fontSize="small" />
        </DuncitIconButton>
      </DialogTitle>
      <DialogContent dividers>
        <IdeaDetailsBody
          loading={loading}
          hasData={!!data}
          idea={idea}
          myId={myId}
          onDelete={onDeleteComment}
          onToggleLike={onToggleLike}
        />
      </DialogContent>
      {idea && myId && (
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <TextField
            fullWidth
            size="small"
            placeholder={t('mweb.common.addAComment')}
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 1000))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            disabled={posting}
          />
          <DuncitIconButton color="primary" onClick={submit} disabled={posting || !text.trim()}>
            <SendIcon />
          </DuncitIconButton>
        </DialogActions>
      )}
    </Dialog>
  );
}
