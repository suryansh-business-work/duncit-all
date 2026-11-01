import { useId, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Autocomplete, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { notify } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { AUDIENCE_LIST_OWNERS } from '../../target-audience-page/queries';
import { ownerLabel, type OwnerOption } from '../../target-audience-page/audience-list-form/audience-list.types';
import { SET_SOCIAL_ACCOUNT_OWNER, type SocialAccount } from '../queries';

interface Props {
  account: SocialAccount;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Who answers for an account. The owner is picked from everybody who can open
 * this portal — the same list an audience list's owner comes from — because
 * the owner is who the expiry reminder goes to, and a reminder to somebody who
 * cannot reach Social Accounts to reconnect helps nobody. Ids are what is kept;
 * the pickers only show the ones still in the list, so a person who has since
 * lost access is kept as the owner until somebody chooses otherwise.
 */
export default function OwnerDialog({ account, onClose, onSaved }: Readonly<Props>) {
  const { t } = useTranslation();
  const titleId = useId();
  const [ownerId, setOwnerId] = useState<string | null>(account.owner_user_id);
  const [teamIds, setTeamIds] = useState<string[]>(account.team_user_ids);
  const { data, loading, error } = useQuery<{ audienceListOwners: OwnerOption[] }>(AUDIENCE_LIST_OWNERS);
  const [save, saveState] = useMutation<{ setSocialAccountOwner: SocialAccount }>(SET_SOCIAL_ACCOUNT_OWNER);
  const options = data?.audienceListOwners ?? [];

  const submit = async () => {
    try {
      await save({ variables: { id: account.id, owner_user_id: ownerId, team_user_ids: teamIds } });
      notify(t('marketing.social.ownerSaved', { vars: { name: account.name } }), 'success');
      onSaved();
      onClose();
    } catch (err) {
      notify(parseApiError(err), 'error');
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" aria-labelledby={titleId} data-testid="social-owner-dialog">
      <DialogTitle id={titleId}>{t('marketing.social.setOwnerOf', { vars: { name: account.name } })}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error && <Alert severity="error">{parseApiError(error)}</Alert>}
          <Autocomplete<OwnerOption>
            options={options}
            loading={loading}
            value={options.find((option) => option.id === ownerId) ?? null}
            getOptionLabel={ownerLabel}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            onChange={(_event, option) => setOwnerId(option?.id ?? null)}
            noOptionsText={t('marketing.social.nobodyToPick')}
            renderInput={(params) => (
              <TextField {...params} label={t('marketing.social.ownerField')} helperText={t('marketing.social.ownerHint')} />
            )}
          />
          <Autocomplete<OwnerOption, true>
            multiple
            options={options}
            loading={loading}
            value={options.filter((option) => teamIds.includes(option.id))}
            getOptionLabel={ownerLabel}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            onChange={(_event, picked) => setTeamIds(picked.map((option) => option.id))}
            noOptionsText={t('marketing.social.nobodyToPick')}
            renderInput={(params) => (
              <TextField {...params} label={t('marketing.social.teamField')} helperText={t('marketing.social.teamHint')} />
            )}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose} disabled={saveState.loading} data-testid="social-owner-cancel">
          {t('shell.common.cancel')}
        </DuncitButton>
        <DuncitButton variant="contained" onClick={submit} loading={saveState.loading} data-testid="social-owner-save">
          {t('shell.common.save')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
