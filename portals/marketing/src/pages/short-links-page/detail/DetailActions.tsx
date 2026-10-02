import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { ConfirmDialog, notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { ERASE_SHORT_LINK_CLICKS, SET_SHORT_LINK_ACTIVE, type ShortLinkRow } from '../queries';
import EditShortLinkDialog from '../EditShortLinkDialog';

type PendingAction = 'ERASE' | 'EDIT';

interface Props {
  link: ShortLinkRow;
  onChanged: () => void;
}

/** Edit, retire or revive the link, and answer an erasure request for its clicks. */
export default function DetailActions({ link, onChanged }: Readonly<Props>) {
  const { t } = useTranslation();
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [setActive, { loading: toggling }] = useMutation<any>(SET_SHORT_LINK_ACTIVE);
  const [erase, { loading: erasing }] = useMutation<any>(ERASE_SHORT_LINK_CLICKS);

  const toggleActive = async () => {
    await setActive({ variables: { id: link.id, is_active: !link.is_active } });
    const done = link.is_active ? 'marketing.shortLinks.retired' : 'marketing.shortLinks.reactivated';
    notifySuccess(t(done, { vars: { label: link.label } }));
    onChanged();
  };

  const confirmErase = async () => {
    setError(null);
    let removed = 0;
    try {
      const result = await erase({ variables: { id: link.id } });
      removed = Number(result.data?.eraseShortLinkClicks ?? 0);
    } catch (e) {
      setError(parseApiError(e, t('marketing.shortLinks.couldNotEraseClicks')));
      return;
    }
    notifySuccess(
      t('marketing.shortLinks.eraseClicksDone', { vars: { count: removed.toLocaleString() } }),
    );
    setPending(null);
    onChanged();
  };

  const toggleLabel = link.is_active
    ? t('marketing.shortLinks.retireLink')
    : t('marketing.shortLinks.reactivateLink');

  return (
    <Stack direction="row" spacing={1}>
      <DuncitButton variant="outlined" onClick={() => setPending('EDIT')} data-testid="short-link-edit">
        {t('marketing.shortLinks.editLink')}
      </DuncitButton>
      <DuncitButton
        variant="outlined"
        color="error"
        disabled={erasing}
        onClick={() => setPending('ERASE')}
        data-testid="short-link-erase-clicks"
      >
        {t('marketing.shortLinks.eraseClickData')}
      </DuncitButton>
      <DuncitButton
        variant="outlined"
        color={link.is_active ? 'warning' : 'primary'}
        disabled={toggling}
        onClick={() => {
          toggleActive().catch(() => undefined);
        }}
        data-testid="short-link-toggle-active"
      >
        {toggleLabel}
      </DuncitButton>

      {pending === 'EDIT' && (
        <EditShortLinkDialog
          link={link}
          onClose={() => setPending(null)}
          onSaved={() => {
            setPending(null);
            onChanged();
          }}
        />
      )}

      {pending === 'ERASE' && (
        <ConfirmDialog
          open
          title={t('marketing.shortLinks.eraseClicksTitle')}
          message={error ?? t('marketing.shortLinks.eraseClicksMessage')}
          confirmLabel={t('marketing.shortLinks.eraseClickData')}
          confirmColor="error"
          loading={erasing}
          busyLabel={t('marketing.shortLinks.erasing')}
          onClose={() => {
            setPending(null);
            setError(null);
          }}
          onConfirm={confirmErase}
        />
      )}
    </Stack>
  );
}
