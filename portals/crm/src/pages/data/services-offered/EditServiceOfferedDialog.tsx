import { useEffect, useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
} from '@mui/material';
import {
  CRM_SERVICES_OFFERED,
  UPDATE_CRM_SERVICE_OFFERED,
  type CrmServiceOffered,
} from '../../../api/data.gql';
import { parseApiError } from '@duncit/utils';
import ServiceTargetSwitches from './ServiceTargetSwitches';
import { useTranslation } from '@duncit/shell';

interface Props {
  service: CrmServiceOffered | null;
  onClose: () => void;
  onSaved?: () => void;
}

/** Edit a single Service Offered title / active state. Hierarchy stays fixed. */
export default function EditServiceOfferedDialog({ service, onClose, onSaved }: Readonly<Props>) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [venue, setVenue] = useState(true);
  const [host, setHost] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [updateMut, { loading }] = useMutation(UPDATE_CRM_SERVICE_OFFERED, {
    refetchQueries: [{ query: CRM_SERVICES_OFFERED }],
  });

  useEffect(() => {
    if (service) {
      setTitle(service.title);
      setIsActive(service.is_active);
      setVenue(service.applies_to_venue);
      setHost(service.applies_to_host);
      setFormError(null);
    }
  }, [service]);

  const save = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setFormError(t('crm.components.titleIsRequired'));
      return;
    }
    if (!venue && !host) {
      setFormError('Pick at least one of Venue or Host.');
      return;
    }
    setFormError(null);
    try {
      await updateMut({
        variables: {
          id: service!.id,
          input: { title: trimmed, is_active: isActive, applies_to_venue: venue, applies_to_host: host },
        },
      });
      onSaved?.();
      onClose();
    } catch (err) {
      setFormError(parseApiError(err));
    }
  };

  return (
    <Dialog open={!!service} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('crm.data.editServiceOffered')}</DialogTitle>
      <DialogContent>
        {formError && <Alert severity="error" sx={{ mb: 1.5 }}>{formError}</Alert>}
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <TextField
            size="small"
            label={t('shell.common.title')}
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            helperText={t('crm.data.duplicateTitlesInTheSameCategory')}
            fullWidth
            autoFocus
          />
          <FormControlLabel
            control={<Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />}
            label={t('crm.common.active')}
          />
          <Divider flexItem />
          <ServiceTargetSwitches
            venue={venue}
            host={host}
            onChange={({ venue: v, host: h }) => { setVenue(v); setHost(h); }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('shell.common.cancel')}</Button>
        <Button variant="contained" onClick={save} disabled={loading || !title.trim() || (!venue && !host)}>
          {loading ? 'Saving…' : t('shell.common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
