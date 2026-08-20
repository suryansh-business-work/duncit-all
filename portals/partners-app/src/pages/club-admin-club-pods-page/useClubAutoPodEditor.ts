import { useCallback, useState } from 'react';
import { useMutation } from '@apollo/client';
import { notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { toAutoPodInput, type AutoPodFormValues } from '@duncit/auto-pods';
import { useTranslation } from '@duncit/app-settings';
import { CLUB_ADMIN_CREATE_AUTO_POD } from './queries';

interface Args {
  clubId: string;
  /** Reload the club's Auto Pod queue / pods table once the offer is open. */
  onSaved: () => void;
}

/**
 * Create-only, unlike the admin console's editor: a Club Admin opens the offer
 * and the marketplace takes it from there. Editing and cancelling an Auto Pod
 * stay with Duncit admins, because both change what a venue already priced.
 */
export default function useClubAutoPodEditor({ clubId, onSaved }: Readonly<Args>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createMutation] = useMutation(CLUB_ADMIN_CREATE_AUTO_POD);

  const openCreate = useCallback(() => {
    setError(null);
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setError(null);
  }, []);

  const submit = useCallback(
    async (values: AutoPodFormValues) => {
      setSaving(true);
      setError(null);
      try {
        await createMutation({
          variables: { input: toAutoPodInput(values), club_id: clubId },
        });
        notifySuccess(t('admin.autoPods.created'));
        setOpen(false);
        onSaved();
      } catch (caught) {
        setError(t('admin.autoPods.saveFailed', { vars: { reason: parseApiError(caught) } }));
      } finally {
        setSaving(false);
      }
    },
    [clubId, createMutation, onSaved, t]
  );

  return { open, saving, error, openCreate, close, submit };
}
