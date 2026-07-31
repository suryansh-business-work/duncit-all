import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { notifyError } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import {
  ADMIN_SET_HOST_CATEGORIES,
  APPROVE,
  DEFAULT_HOST_COMMISSION,
  HOST_SURVEY_CATEGORY,
  REJECT,
  SET_HOST_DEDUCTIONS,
  type HostRow,
} from './queries';
import type { HostCategoryValue } from '../../forms/host';

/** Ids only — the server re-validates each triple and denormalizes the names. */
const toCategoryInput = (c: HostCategoryValue) => ({
  super_category_id: c.super_category_id,
  category_id: c.category_id,
  sub_category_id: c.sub_category_id,
});

/**
 * Everything the Review Host dialog persists.
 *
 * The dialog has no save buttons: the commission saves on blur and the
 * categories save the moment one is added or removed. That makes silent
 * failure the real risk, so every mutation here resolves to a boolean and
 * surfaces its error both inline (`saveError`) and as a toast — the caller
 * never sees a rejected promise.
 */
export function useHostReview(refresh: () => void) {
  const [approve, { loading: approving }] = useMutation(APPROVE);
  const [reject, { loading: rejecting }] = useMutation(REJECT);
  const [setHostDeductions, { loading: savingCommission }] = useMutation(SET_HOST_DEDUCTIONS);
  const [setHostCategories, { loading: savingCategories }] = useMutation(ADMIN_SET_HOST_CATEGORIES);

  const [active, setActive] = useState<HostRow | null>(null);
  const [notes, setNotes] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  // A blur/add save already refetched nothing; the table is refreshed once on
  // close instead, so the grid does not flicker behind the open dialog.
  const dirtyRef = useRef(false);

  const { data: defaultsData } = useQuery(DEFAULT_HOST_COMMISSION, { fetchPolicy: 'cache-first' });
  const defaultCommissionPct: number | undefined = defaultsData?.defaultHostCommissionPct;

  const { data: surveyData } = useQuery(HOST_SURVEY_CATEGORY, {
    variables: { host_doc_id: active?.id ?? '' },
    skip: !active,
    fetchPolicy: 'cache-first',
  });
  const surveyCategory: HostCategoryValue | null = surveyData?.host?.survey_category ?? null;

  const fail = useCallback((e: unknown, fallback: string) => {
    const message = parseApiError(e, fallback);
    setSaveError(message);
    notifyError(message);
    return false;
  }, []);

  const openReview = (host: HostRow) => {
    setActive(host);
    setNotes('');
    setTagsText((host.tags ?? []).join(', '));
    setSaveError(null);
  };

  const closeReview = () => {
    setActive(null);
    setSaveError(null);
    if (dirtyRef.current) {
      dirtyRef.current = false;
      refresh();
    }
  };

  const saveCommission = useCallback(
    async (pct: number) => {
      if (!active) return false;
      try {
        await setHostDeductions({ variables: { user_id: active.user_id, host_commission_pct: pct } });
      } catch (e) {
        return fail(e, 'Could not save the host commission');
      }
      setSaveError(null);
      dirtyRef.current = true;
      setActive((current) => (current ? { ...current, host_commission_pct: pct } : current));
      return true;
    },
    [active, fail, setHostDeductions],
  );

  const saveCategories = useCallback(
    async (categories: HostCategoryValue[]) => {
      if (!active) return false;
      let saved: HostCategoryValue[];
      try {
        const { data } = await setHostCategories({
          variables: { host_doc_id: active.id, categories: categories.map(toCategoryInput) },
        });
        saved = data?.adminSetHostCategories?.host_categories ?? [];
      } catch (e) {
        return fail(e, 'Could not save the host categories');
      }
      setSaveError(null);
      dirtyRef.current = true;
      // Take the server's answer, not the optimistic list: it carries the
      // denormalized names and each triple's request_no linkage.
      setActive((current) => (current ? { ...current, host_categories: saved } : current));
      return true;
    },
    [active, fail, setHostCategories],
  );

  // Hosts drafted before the meeting flow seeded categories — and anyone whose
  // triple was incomplete at the time — reach review with an empty list even
  // though they did pick a category in the Earn with Duncit gate. Adopt it once
  // so the reviewer opens on a filled-in, saved list rather than a warning.
  const prefilledRef = useRef<string | null>(null);
  useEffect(() => {
    if (!active) {
      prefilledRef.current = null;
      return;
    }
    if (!surveyCategory || (active.host_categories ?? []).length > 0) return;
    if (prefilledRef.current === active.id) return;
    prefilledRef.current = active.id;
    saveCategories([surveyCategory]).catch((e) => fail(e, 'Could not apply the survey category'));
  }, [active, surveyCategory, saveCategories, fail]);

  const doApprove = async () => {
    if (!active) return;
    const tags = tagsText.split(',').map((tag) => tag.trim()).filter(Boolean);
    try {
      await approve({ variables: { id: active.id, notes, tags } });
    } catch (e) {
      fail(e, 'Could not approve this host');
      return;
    }
    dirtyRef.current = true;
    closeReview();
  };

  const doReject = async () => {
    if (!active || !notes.trim()) return;
    try {
      await reject({ variables: { id: active.id, notes } });
    } catch (e) {
      fail(e, 'Could not reject this host');
      return;
    }
    dirtyRef.current = true;
    closeReview();
  };

  return {
    active,
    notes,
    setNotes,
    tagsText,
    setTagsText,
    saveError,
    dismissError: () => setSaveError(null),
    defaultCommissionPct,
    surveyCategory,
    openReview,
    closeReview,
    saveCommission,
    saveCategories,
    doApprove,
    doReject,
    savingCommission,
    savingCategories,
    deciding: approving || rejecting,
  };
}
