import { useId } from 'react';
import { useMutation } from '@apollo/client/react';
import { Dialog, DialogContent, DialogTitle } from '@mui/material';
import { notify } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { CREATE_MARKETING_LEAD, type MarketingLeadDetail } from '../queries';
import NewLeadForm from './new-lead.form';
import { toLeadInput, type NewLeadFormValues } from './new-lead.types';

interface Props {
  open: boolean;
  onClose: () => void;
  /** The lead's id — the one made, or the one it merged into. */
  onCreated: (id: string) => void;
}

/** The New lead form in a dialog. A lead already known by a contact is merged into, and the person is told so. */
export default function NewLeadDialog({ open, onClose, onCreated }: Readonly<Props>) {
  const { t } = useTranslation();
  const titleId = useId();
  const [create, { loading }] = useMutation<{ createMarketingLead: { lead: MarketingLeadDetail; merged: boolean } }>(CREATE_MARKETING_LEAD);

  const submit = async (values: NewLeadFormValues): Promise<boolean> => {
    try {
      const { data } = await create({ variables: { input: toLeadInput(values) } });
      if (!data) return false;
      notify(t(data.createMarketingLead.merged ? 'marketing.leads.merged' : 'marketing.leads.created'), 'success');
      onCreated(data.createMarketingLead.lead.id);
      onClose();
      return true;
    } catch (err) {
      notify(parseApiError(err), 'error');
      return false;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" aria-labelledby={titleId} data-testid="new-lead-dialog">
      <DialogTitle id={titleId}>{t('marketing.leads.newLeadTitle')}</DialogTitle>
      <DialogContent>
        <NewLeadForm busy={loading} onSubmit={submit} onCancel={onClose} />
      </DialogContent>
    </Dialog>
  );
}
