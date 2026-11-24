import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useTranslation } from '@duncit/shell';

/** Router state the lead editor reads: the page it was opened from, and a message to show on arrival. */
export interface LeadEditorState {
  from?: string;
  /**
   * Shown once the editor mounts. "Create & Continue" moves from the /new route
   * to the lead's own edit route, which mounts a NEW editor, so a notice held in
   * the old editor's state would be thrown away with it.
   */
  notice?: string;
}

/**
 * Router state to hand the lead editor so it can come back here (path, query
 * string and all, so a detail page's tab or a listing's filters survive).
 */
export function useLeadEditorOrigin(): LeadEditorState {
  const { pathname, search } = useLocation();
  return { from: `${pathname}${search}` };
}

/**
 * Save and navigation behaviour shared by the venue, host and ecomm lead editors.
 *
 * - `submit` saves, then leaves for the page the editor was opened from. With no
 *   recorded origin an existing lead goes to its own detail page, not the listing,
 *   because that is the lead the user was working on.
 * - `submitAndContinue` saves and keeps the user on the form. A brand-new lead
 *   moves onto its edit URL (replacing `/new` in history), so the next save
 *   updates it instead of creating a duplicate.
 */
export function useLeadEditorFlow<T>(basePath: string, id: string | undefined, save: (values: T) => Promise<{ id: string }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const arrival = location.state as LeadEditorState | null;
  const from = arrival?.from;
  const [notice, setNotice] = useState<string | null>(arrival?.notice ?? null);
  // The router may keep the same editor instance when /new becomes /:id (both
  // render the same page), so a notice that arrives with a new navigation is
  // picked up here too, not only on the first mount.
  const arrivalNotice = arrival?.notice;
  useEffect(() => {
    if (arrivalNotice) setNotice(arrivalNotice);
  }, [location.key, arrivalNotice]);

  const exit = () => navigate(from ?? (id ? `${basePath}/${id}/view` : basePath));

  const submit = async (values: T) => {
    await save(values);
    exit();
  };

  const submitAndContinue = async (values: T) => {
    const saved = await save(values);
    if (id) {
      setNotice(t('crm.forms.leadUpdated'));
      return;
    }
    navigate(`${basePath}/${saved.id}`, {
      replace: true,
      state: { from, notice: t('crm.forms.leadCreated') } satisfies LeadEditorState,
    });
  };

  return { exit, submit, submitAndContinue, notice, clearNotice: () => setNotice(null) };
}
