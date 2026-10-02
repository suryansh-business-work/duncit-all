import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Dialog, DialogContent, DialogTitle, Typography } from '@mui/material';
import { notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import ShortLinkForm, {
  shortLinkValuesFrom,
  toShortLinkUpdateInput,
  type ShortLinkFormValues,
} from './short-link-form';
import { UPDATE_SHORT_LINK, type ShortLinkRow } from './queries';

interface Props {
  link: ShortLinkRow;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Rename a link, re-point it, or change its link-preview card. The channel,
 * medium and campaign are not offered: a link already handed out keeps the
 * attribution it went out with.
 */
export default function EditShortLinkDialog({ link, onClose, onSaved }: Readonly<Props>) {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [updateLink, { loading }] = useMutation(UPDATE_SHORT_LINK);

  const submit = async (values: ShortLinkFormValues) => {
    setError(null);
    try {
      await updateLink({
        variables: { id: link.id, input: toShortLinkUpdateInput(values, link.is_external) },
      });
    } catch (e) {
      setError(parseApiError(e, t('marketing.shortLinks.couldNotUpdate')));
      return;
    }
    notifySuccess(t('marketing.shortLinks.linkUpdated', { vars: { label: values.label } }));
    onSaved();
  };

  return (
    <Dialog open fullWidth maxWidth="sm" onClose={loading ? undefined : onClose}>
      <DialogTitle sx={{ pb: 0.5 }}>
        {/* DialogTitle is already an h2 — a nested h6 is invalid HTML. */}
        <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
          {t('marketing.shortLinks.editLink')}
        </Typography>
        <Typography variant="body2" component="div" sx={{ color: 'text.secondary' }}>
          {t('marketing.shortLinks.editLinkBlurb')}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <ShortLinkForm
          initialValues={shortLinkValuesFrom(link)}
          lockDestination={!!link.share_target}
          submitLabel={t('marketing.shortLinks.saveChanges')}
          external={link.is_external}
          busy={loading}
          errorMessage={error}
          onCancel={onClose}
          onSubmit={submit}
        />
      </DialogContent>
    </Dialog>
  );
}
