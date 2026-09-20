import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { notifySuccess, useConfirm } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import {
  BACKGROUND_JOBS_QUERY,
  DELETE_LOCALE,
  START_AI_TRANSLATION,
  UPSERT_LOCALE,
  localeName,
  type LocaleRow,
} from '../../lib/queries';
import type { LocaleFormValues } from './LocaleDialog';

/** A rejected mutation is always an Error — Apollo wraps anything else. */
const messageOf = (error: unknown): string => (error as Error).message;

interface Options {
  /** The row being edited; null while adding. */
  editing: LocaleRow | null;
  onSaved: () => void;
  onRemoved: () => void;
}

/**
 * Saving, removing and — for a new language — handing it straight to AI
 * translation. A language added here carries no text at all, and filling the
 * catalogue by hand is why locales used to be added and then left unused, so
 * "Translate with AI" is part of adding one rather than a second visit.
 */
export function useLocaleActions({ editing, onSaved, onRemoved }: Readonly<Options>) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [upsert] = useMutation<{ upsertLocale: LocaleRow }>(UPSERT_LOCALE, { refetchQueries: ['Locales'] });
  const [remove] = useMutation(DELETE_LOCALE, { refetchQueries: ['Locales'] });
  const [startAi] = useMutation(START_AI_TRANSLATION, { refetchQueries: [BACKGROUND_JOBS_QUERY] });
  const [saving, setSaving] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);

  /** The whole catalogue, gaps only — a new language has nothing but gaps. */
  const translateNew = async (saved: LocaleRow) => {
    try {
      await startAi({
        variables: { input: { locales: [saved.code], scope: 'MISSING' }, url: window.location.href },
      });
      notifySuccess(t('localization.locales.aiStarted', { vars: { language: localeName(saved) } }));
    } catch (e) {
      // The language IS saved; only the translation did not start.
      setOpError(t('localization.locales.aiStartFailed', { vars: { reason: messageOf(e) } }));
    }
  };

  const submit = async ({ ai_translate: aiTranslate, ...input }: LocaleFormValues) => {
    setSaving(true);
    setOpError(null);
    let saved: LocaleRow | undefined;
    try {
      const res = await upsert({ variables: { input } });
      saved = res.data?.upsertLocale;
    } catch (e) {
      setOpError(messageOf(e));
      return;
    } finally {
      setSaving(false);
    }
    notifySuccess(editing ? t('localization.locales.updated') : t('localization.locales.added'));
    onSaved();
    if (!editing && aiTranslate && saved && !saved.is_default) await translateNew(saved);
  };

  const del = async (row: LocaleRow) => {
    const ok = await confirm({
      title: t('localization.locales.deleteTitle', { vars: { language: localeName(row) } }),
      message: t('localization.locales.deleteMessage'),
      confirmLabel: t('shell.common.delete'),
      cancelLabel: t('shell.common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    setOpError(null);
    try {
      await remove({ variables: { code: row.code } });
      notifySuccess(t('localization.locales.removed', { vars: { code: row.code } }));
      onRemoved();
    } catch (e) {
      setOpError(messageOf(e));
    }
  };

  return { submit, del, saving, opError };
}
