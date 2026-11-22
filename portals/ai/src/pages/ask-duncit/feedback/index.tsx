import { useCallback, useMemo, useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { Box, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { DuncitTable, dateColumn, useApolloTableFetch, type DuncitColumn } from '@duncit/table';
import { useTranslation } from '@duncit/shell';
import { parseApiError } from '@duncit/utils';
import { AskDuncitReviewForm, type AskDuncitReviewValues } from '../../../forms/ask-duncit-review';
import ConversationDrawer from '../shared/ConversationDrawer';
import PageHeader from '../shared/PageHeader';
import { REVIEW_ASK_DUNCIT_FEEDBACK } from '../shared/mutations';
import { ASK_DUNCIT_FEEDBACK_TABLE } from '../shared/queries';
import type { FeedbackRow } from '../shared/types';

const FORM_ID = 'ask-duncit-review';
const options = (values: readonly string[]) => values.map((value) => ({ value, label: value }));

/**
 * Ask Duncit › Feedback & Evaluation — every thumbs-up/down with the answer's
 * evaluated confidence. Reviewing one accepts or dismisses it; accepting with
 * a corrected answer can draft a knowledge article (admin-reviewed learning).
 */
export default function AskDuncitFeedbackPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const fetchRows = useApolloTableFetch<FeedbackRow>(client, ASK_DUNCIT_FEEDBACK_TABLE, 'askDuncitFeedbackTable');
  const [review, reviewing] = useMutation<{ reviewAskDuncitFeedback: { knowledge_draft_id: string | null } }>(REVIEW_ASK_DUNCIT_FEEDBACK);
  const [open, setOpen] = useState<FeedbackRow | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const submit = async (values: AskDuncitReviewValues) => {
    if (!open) return;
    try {
      const { data } = await review({ variables: { messageId: open.id, status: values.status, note: values.note, addToKnowledge: values.add_to_knowledge } });
      notifySuccess(t(data?.reviewAskDuncitFeedback.knowledge_draft_id ? 'ai.askDuncit.feedback.drafted' : 'ai.askDuncit.saved'));
      setOpen(null);
      refetchRef.current?.();
    } catch (e) {
      notifyError(parseApiError(e) || t('ai.askDuncit.saveFailed'));
    }
  };

  const columns = useMemo<DuncitColumn<FeedbackRow>[]>(
    () => [
      dateColumn<FeedbackRow>({ field: 'created_at', headerName: t('ai.askDuncit.col.when'), width: 165 }),
      { field: 'feedback.rating', headerName: t('ai.askDuncit.feedback.rating'), width: 100, type: 'enum', options: options(['UP', 'DOWN']), valueGetter: (row) => row.rating, cellRenderer: (row) => <Chip size="small" color={row.rating === 'UP' ? 'success' : 'error'} label={row.rating} /> },
      {
        field: 'content',
        type: 'text',
        headerName: t('ai.askDuncit.feedback.answer'),
        flex: 1,
        minWidth: 280,
        sortable: false,
        valueGetter: (row) => row.content,
        cellRenderer: (row) => (
          <Typography variant="body2" noWrap title={row.content}>
            {row.content}
          </Typography>
        ),
      },
      { field: 'comment', type: 'text', headerName: t('ai.askDuncit.feedback.comment'), width: 200, sortable: false, filterable: false, valueGetter: (row) => row.comment || '—' },
      { field: 'confidence', headerName: t('ai.askDuncit.feedback.confidence'), width: 120, type: 'number', valueGetter: (row) => (row.confidence === null ? '—' : `${Math.round(row.confidence * 100)}%`) },
      { field: 'feedback.review_status', headerName: t('ai.askDuncit.feedback.review'), width: 130, type: 'enum', options: options(['PENDING', 'ACCEPTED', 'DISMISSED']), valueGetter: (row) => row.review_status ?? 'PENDING' },
    ],
    [t]
  );
  const getRowId = useCallback((row: FeedbackRow) => row.id, []);

  return (
    <Box>
      <PageHeader title={t('ai.askDuncit.feedback.title')} subtitle={t('ai.askDuncit.feedback.subtitle')} />
      <DuncitTable tableId="ai.askDuncit.feedback" columns={columns} fetchRows={fetchRows} getRowId={getRowId} refetchRef={refetchRef} onRowClick={setOpen} defaultSort={{ field: 'created_at', dir: 'desc' }} emptyText={t('ai.askDuncit.feedback.empty')} />
      <Dialog open={Boolean(open)} onClose={() => setOpen(null)} fullWidth maxWidth="sm" aria-labelledby="ask-duncit-review-title">
        <DialogTitle id="ask-duncit-review-title">{t('ai.askDuncit.feedback.reviewTitle')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 1.5, color: 'text.secondary' }}>
            {open?.content}
          </Typography>
          {open && <AskDuncitReviewForm key={open.id} formId={FORM_ID} onSubmit={submit} />}
        </DialogContent>
        <DialogActions>
          {open && <DuncitButton onClick={() => setConversationId(open.conversation_id)}>{t('ai.askDuncit.openConversation')}</DuncitButton>}
          <DuncitButton onClick={() => setOpen(null)}>{t('ai.askDuncit.cancel')}</DuncitButton>
          <DuncitButton type="submit" form={FORM_ID} variant="contained" disabled={reviewing.loading}>
            {t('ai.askDuncit.save')}
          </DuncitButton>
        </DialogActions>
      </Dialog>
      <ConversationDrawer conversationId={conversationId} onClose={() => setConversationId(null)} />
    </Box>
  );
}
