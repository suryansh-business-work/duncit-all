import { useMemo } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { parseApiError } from '@duncit/utils';
import { AskDuncitKnowledgeForm, askDuncitKnowledgeDefaults, splitTags, type AskDuncitKnowledgeValues } from '../../../forms/ask-duncit-knowledge';
import { CREATE_ASK_DUNCIT_KNOWLEDGE, UPDATE_ASK_DUNCIT_KNOWLEDGE } from '../shared/mutations';
import { ASK_DUNCIT_KNOWLEDGE_ARTICLE } from '../shared/queries';

interface Props {
  /** 'new' for a new article, an id to edit, null when closed. */
  articleId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

interface Article extends Omit<AskDuncitKnowledgeValues, 'tags'> {
  id: string;
  tags: string[];
}

const FORM_ID = 'ask-duncit-knowledge';

/** Create or edit one knowledge article; the server versions every edit and audits it. */
export default function KnowledgeDialog({ articleId, onClose, onSaved }: Readonly<Props>) {
  const { t } = useTranslation();
  const editing = Boolean(articleId && articleId !== 'new');
  const { data, loading } = useQuery<{ askDuncitKnowledgeArticle: Article | null }>(ASK_DUNCIT_KNOWLEDGE_ARTICLE, {
    variables: { id: articleId },
    skip: !editing,
    fetchPolicy: 'network-only',
  });
  const [create, creating] = useMutation(CREATE_ASK_DUNCIT_KNOWLEDGE);
  const [update, updating] = useMutation(UPDATE_ASK_DUNCIT_KNOWLEDGE);
  const article = data?.askDuncitKnowledgeArticle;
  const initialValues = useMemo<AskDuncitKnowledgeValues>(
    () => (article ? { ...askDuncitKnowledgeDefaults, ...article, tags: article.tags.join(', ') } : askDuncitKnowledgeDefaults),
    [article]
  );

  const submit = async (values: AskDuncitKnowledgeValues) => {
    const input = { ...values, tags: splitTags(values.tags) };
    try {
      if (editing) await update({ variables: { id: articleId, input } });
      else await create({ variables: { input } });
      notifySuccess(t('ai.askDuncit.saved'));
      onSaved();
      onClose();
    } catch (e) {
      notifyError(parseApiError(e) || t('ai.askDuncit.saveFailed'));
    }
  };

  const ready = !editing || Boolean(article);
  return (
    <Dialog open={Boolean(articleId)} onClose={onClose} fullWidth maxWidth="md" aria-labelledby="ask-duncit-knowledge-title">
      <DialogTitle id="ask-duncit-knowledge-title">{t(editing ? 'ai.askDuncit.knowledge.edit' : 'ai.askDuncit.knowledge.new')}</DialogTitle>
      <DialogContent>
        {loading && <CircularProgress size={24} aria-label={t('ai.askDuncit.loading')} />}
        {ready && <AskDuncitKnowledgeForm key={article?.id ?? 'new'} formId={FORM_ID} initialValues={initialValues} onSubmit={submit} />}
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose}>{t('ai.askDuncit.cancel')}</DuncitButton>
        <DuncitButton type="submit" form={FORM_ID} variant="contained" disabled={creating.loading || updating.loading || !ready}>
          {t('ai.askDuncit.save')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
