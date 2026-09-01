import { useRef, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { notifyError, notifySuccess, useConfirm } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { CREATE_FAQ, DELETE_FAQ, UPDATE_FAQ } from './queries';
import type { FaqRow } from './FaqsTableBase';
import { emptyFaqForm, toFaqForm, type FaqFormValues } from './faq-form';

interface Messages {
  created: string;
  updated: string;
  deleted: string;
  deleteTitle: string;
}

interface Options {
  /** Category a brand-new FAQ starts on — '' for App, a topic for Partners. */
  defaultCategory: string;
  /** Reads this audience's category field off a row being edited. */
  readCategory: (row: FaqRow) => string;
  /** Turns the form's shared value shape into this audience's mutation input. */
  toInput: (values: FaqFormValues) => Record<string, unknown>;
  messages: Messages;
}

const messageOf = (cause: unknown, fallback: string) =>
  cause instanceof Error ? cause.message : fallback;

/**
 * The create/edit/delete wiring both FAQ audiences share. Everything that
 * differs between them arrives as an option, so neither page owns a second
 * copy of the same three mutations (rule 34).
 */
export function useFaqCrud({ defaultCategory, readCategory, toInput, messages }: Options) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const refetchRef = useRef<(() => void) | null>(null);
  const [values, setValues] = useState<FaqFormValues>(() => emptyFaqForm(defaultCategory));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createFaq, createState] = useMutation<any>(CREATE_FAQ);
  const [updateFaq, updateState] = useMutation<any>(UPDATE_FAQ);
  const [deleteFaq] = useMutation<any>(DELETE_FAQ);

  const openNew = () => {
    setEditingId(null);
    setValues(emptyFaqForm(defaultCategory));
    setError(null);
    setOpen(true);
  };

  const openEdit = (row: FaqRow) => {
    setEditingId(row.id);
    setValues(toFaqForm(row, readCategory(row)));
    setError(null);
    setOpen(true);
  };

  const submit = async (next: FaqFormValues) => {
    setError(null);
    try {
      const input = toInput(next);
      if (editingId) {
        await updateFaq({ variables: { faq_doc_id: editingId, input } });
      } else {
        await createFaq({ variables: { input } });
      }
      setOpen(false);
      notifySuccess(editingId ? messages.updated : messages.created);
      refetchRef.current?.();
    } catch (cause) {
      setError(messageOf(cause, t('support.faqs.saveFailed')));
    }
  };

  const remove = async (row: FaqRow) => {
    const confirmed = await confirm({
      title: messages.deleteTitle,
      message: t('support.faqs.deleteBody'),
      confirmLabel: t('shell.common.delete'),
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await deleteFaq({ variables: { faq_doc_id: row.id } });
      notifySuccess(messages.deleted);
      refetchRef.current?.();
    } catch (cause) {
      notifyError(messageOf(cause, t('support.faqs.saveFailed')));
    }
  };

  return {
    refetchRef,
    values,
    open,
    error,
    saving: createState.loading || updateState.loading,
    editing: editingId !== null,
    close: () => setOpen(false),
    openNew,
    openEdit,
    submit,
    remove,
  };
}
