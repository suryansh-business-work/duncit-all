import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  Autocomplete,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useDebouncedValue } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '../../i18n';
import {
  ADD_REGION_CLUB_ADMIN,
  REGION_CLUB_ADMIN_CANDIDATES,
  type RegionCandidate,
} from '../queries';

interface Props {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}

const optionLabel = (row: RegionCandidate) => row.name || row.email || row.user_id;

/**
 * Add a Club Admin to the region.
 *
 * The picker only offers people who hold CLUB_ADMIN and are in no region yet —
 * a club admin under two managers is two people accountable for the same
 * clubs, so the server refuses it and the list never dangles the option.
 */
export default function AddClubAdminDialog({ open, onClose, onAdded }: Readonly<Props>) {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const [chosen, setChosen] = useState<RegionCandidate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const term = useDebouncedValue(input.trim(), 300);

  const { data, loading } = useQuery<{ regionClubAdminCandidates: RegionCandidate[] }>(
    REGION_CLUB_ADMIN_CANDIDATES,
    { variables: { search: term || null }, skip: !open, fetchPolicy: 'cache-and-network' },
  );
  const [add, addState] = useMutation(ADD_REGION_CLUB_ADMIN);

  const close = () => {
    setChosen(null);
    setInput('');
    setError(null);
    onClose();
  };

  const submit = async (candidate: RegionCandidate) => {
    setError(null);
    try {
      await add({ variables: { user_id: candidate.user_id } });
      onAdded();
      close();
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="xs">
      <DialogTitle>{t('partners.regional.addClubAdmin')}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ pt: 1 }}>
          {error && (
            <Typography variant="body2" sx={{ color: 'error.main' }}>
              {error}
            </Typography>
          )}
          <Autocomplete<RegionCandidate, false, false, false>
            options={data?.regionClubAdminCandidates ?? []}
            value={chosen}
            loading={loading}
            getOptionLabel={optionLabel}
            isOptionEqualToValue={(option, value) => option.user_id === value.user_id}
            filterOptions={(all) => all}
            onInputChange={(_event, next) => setInput(next)}
            onChange={(_event, next) => setChosen(next)}
            noOptionsText={t('partners.regional.noClubAdminsFound')}
            renderOption={(props, option) => {
              const { key, ...rest } = props as { key: string } & Record<string, unknown>;
              return (
                <li key={key} {...rest}>
                  <Stack sx={{ lineHeight: 1.2 }}>
                    <Typography variant="body2">{optionLabel(option)}</Typography>
                    {option.email && (
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {option.email}
                      </Typography>
                    )}
                  </Stack>
                </li>
              );
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label={t('partners.regional.searchClubAdmins')}
                helperText={t('partners.regional.candidateHint')}
                slotProps={{
                  ...params.slotProps,
                  input: {
                    ...params.slotProps.input,
                    endAdornment: (
                      <>
                        {loading ? <CircularProgress size={16} /> : null}
                        {params.slotProps.input.endAdornment}
                      </>
                    ),
                  },
                }}
              />
            )}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={close} disabled={addState.loading}>
          {t('shell.common.cancel')}
        </DuncitButton>
        <DuncitButton
          variant="contained"
          disabled={!chosen || addState.loading}
          onClick={() => chosen && submit(chosen)}
        >
          {t('partners.regional.add')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
