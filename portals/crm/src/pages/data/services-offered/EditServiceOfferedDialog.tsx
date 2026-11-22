import { useEffect, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import {
  Alert,
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
import { DuncitButton } from '@duncit/buttons';
import {
  CRM_SERVICES_OFFERED,
  UPDATE_CRM_SERVICE_OFFERED,
  type CrmServiceOffered,
} from '../../../api/data.gql';
import { parseApiError } from '@duncit/utils';
import ServiceTargetSwitches from './ServiceTargetSwitches';
import {
  defaultServiceTargets,
  hasAnyTarget,
  pickServiceTargets,
  type ServiceTargets,
} from '../../../config/serviceTargets';
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
  const [targets, setTargets] = useState<ServiceTargets>(defaultServiceTargets);
  const [formError, setFormError] = useState<string | null>(null);
  const [updateMut, { loading }] = useMutation<any>(UPDATE_CRM_SERVICE_OFFERED, {
    refetchQueries: [{ query: CRM_SERVICES_OFFERED }],
  });

  useEffect(() => {
    if (service) {
      setTitle(service.title);
      setIsActive(service.is_active);
      setTargets(pickServiceTargets(service));
      setFormError(null);
    }
  }, [service]);

  const save = async () => {
    // Save is disabled for a blank title or no target, so both are always set here.
    setFormError(null);
    try {
      await updateMut({
        variables: {
          id: service!.id,
          input: { title: title.trim(), is_active: isActive, ...targets },
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
            // eslint-disable-next-line jsx-a11y/no-autofocus -- focus moves into the dialog the user just opened (WCAG 2.4.3)
            autoFocus
          />
          <FormControlLabel
            control={<Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />}
            label={t('crm.common.active')}
          />
          <Divider flexItem />
          <ServiceTargetSwitches value={targets} onChange={setTargets} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose}>{t('shell.common.cancel')}</DuncitButton>
        <DuncitButton variant="contained" onClick={save} disabled={loading || !title.trim() || !hasAnyTarget(targets)}>
          {loading ? t('shell.common.saving') : t('shell.common.save')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
