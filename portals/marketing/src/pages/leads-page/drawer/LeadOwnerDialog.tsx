import { useId, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Autocomplete, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { AUDIENCE_LIST_OWNERS } from '../../target-audience-page/queries';
import { ownerLabel, type OwnerOption } from '../../target-audience-page/audience-list-form/audience-list.types';
import type { MarketingLeadDetail } from '../queries';

interface Props {
  lead: MarketingLeadDetail;
  busy: boolean;
  onClose: () => void;
  /** True when the owner was saved — only then does the dialog close. */
  onSave: (ownerUserId: string | null) => Promise<boolean>;
}

/**
 * Who works the lead, picked from everybody who can open this portal — the
 * same list an audience list's or a social account's owner comes from. An
 * owner who has since lost access shows as blank and is kept until somebody
 * picks another.
 */
export default function LeadOwnerDialog({ lead, busy, onClose, onSave }: Readonly<Props>) {
  const { t } = useTranslation();
  const titleId = useId();
  const [ownerId, setOwnerId] = useState<string | null>(lead.owner_user_id);
  const { data, loading, error } = useQuery<{ audienceListOwners: OwnerOption[] }>(AUDIENCE_LIST_OWNERS);
  const options = data?.audienceListOwners ?? [];

  const save = async () => {
    if (await onSave(ownerId)) onClose();
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" aria-labelledby={titleId} data-testid="lead-owner-dialog">
      <DialogTitle id={titleId}>{t('marketing.leads.ownerTitle')}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error">{parseApiError(error)}</Alert>}
        <Autocomplete<OwnerOption>
          options={options}
          loading={loading}
          value={options.find((option) => option.id === ownerId) ?? null}
          getOptionLabel={ownerLabel}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          onChange={(_event, option) => setOwnerId(option?.id ?? null)}
          noOptionsText={t('marketing.leads.nobodyToPick')}
          renderInput={(params) => <TextField {...params} label={t('marketing.leads.ownerField')} helperText={t('marketing.leads.ownerHint')} />}
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose} disabled={busy}>
          {t('shell.common.cancel')}
        </DuncitButton>
        <DuncitButton variant="contained" onClick={save} loading={busy} data-testid="lead-owner-save">
          {t('shell.common.save')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
