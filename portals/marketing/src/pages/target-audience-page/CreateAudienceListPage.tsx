import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Chip, Stack, Step, StepLabel, Stepper, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import GroupIcon from '@mui/icons-material/Group';
import SaveIcon from '@mui/icons-material/Save';
import { useUserData } from '@duncit/user-context';
import { ConfirmDialog, notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { BackHeader } from '@duncit/ui';
import AudiencePicker from './AudiencePicker';
import {
  AudienceListForm,
  AUDIENCE_LIST_FORM_ID,
  ownerNameFor,
  type AudienceListFormValues,
  type OwnerOption,
} from './audience-list-form';
import {
  activeFilterCount,
  buildFilters,
  EMPTY_FILTERS,
  type AudienceFilterState,
} from './audience-filters';
import { AUDIENCE_LIST_OWNERS, CREATE_AUDIENCE_LIST } from './queries';

const STEPS = ['Choose the audience', 'Name the list'];

const peopleLabel = (count: number | null) =>
  count === null ? 'Counting…' : `${count.toLocaleString()} ${count === 1 ? 'person' : 'people'}`;

/** Two steps: define who is in the list, then say what the list is. */
export default function CreateAudienceListPage() {
  const navigate = useNavigate();
  const { user } = useUserData();
  const [step, setStep] = useState(0);
  const [filters, setFilters] = useState<AudienceFilterState>(EMPTY_FILTERS);
  const [matched, setMatched] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingLeave, setConfirmingLeave] = useState(false);
  const [createList, { loading: saving }] = useMutation(CREATE_AUDIENCE_LIST);
  const { data, loading: loadingOwners } = useQuery<{ audienceListOwners: OwnerOption[] }>(
    AUDIENCE_LIST_OWNERS,
    { fetchPolicy: 'cache-and-network' },
  );

  const owners = data?.audienceListOwners ?? [];
  const defaultOwnerId = user?.id ?? '';
  const filterCount = activeFilterCount(filters);

  const backToLists = () => navigate('/audience');

  /** Leaving throws away the filters, so say so before it happens. */
  const requestLeave = () => {
    if (filterCount > 0) setConfirmingLeave(true);
    else backToLists();
  };

  const save = async (values: AudienceListFormValues) => {
    setError(null);
    try {
      await createList({
        variables: {
          input: {
            name: values.name,
            description: values.description,
            // Resolved from the picked account, never typed, so the id and
            // the name it saves under cannot disagree.
            owner: ownerNameFor(values.owner_user_id, owners),
            owner_user_id: values.owner_user_id,
            filters: buildFilters(filters),
          },
        },
      });
    } catch (e) {
      setError(parseApiError(e, 'Could not save the list'));
      return;
    }
    notifySuccess(`“${values.name}” saved`);
    backToLists();
  };

  return (
    <Box>
      <Stack direction="row" alignItems="flex-start" spacing={2} sx={{ mb: 1 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <BackHeader
            onBack={requestLeave}
            backAriaLabel="Back to audience lists"
            eyebrow="Target Audience"
            title="Create list"
          />
        </Box>
        {/* Actions live at the top: step 1 is a full-height table, and a Next
            button below it is off-screen the moment the audience is big. */}
        <Stack direction="row" spacing={1} alignItems="center" sx={{ pt: 0.5 }}>
          <Chip
            icon={<GroupIcon />}
            color={matched ? 'primary' : 'default'}
            variant="outlined"
            label={peopleLabel(matched)}
            // On step 2 this is the way back to the filters that produced it.
            onClick={step === 1 ? () => setStep(0) : undefined}
            data-testid="audience-match-count"
          />
          {step === 1 && (
            <Button startIcon={<ArrowBackIcon />} onClick={() => setStep(0)} disabled={saving}>
              Back
            </Button>
          )}
          {step === 0 && (
            <Button
              variant="contained"
              endIcon={<ArrowForwardIcon />}
              onClick={() => setStep(1)}
              data-testid="audience-step-next"
            >
              Next
            </Button>
          )}
          {step === 1 && (
            <Button
              type="submit"
              form={AUDIENCE_LIST_FORM_ID}
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save list'}
            </Button>
          )}
        </Stack>
      </Stack>

      <Stepper activeStep={step} sx={{ my: 3, maxWidth: 520 }}>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Step 1 stays mounted so its filter state, table page and scroll survive
          a trip to step 2 and back. */}
      <Box sx={{ display: step === 0 ? 'block' : 'none' }}>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Filter down to the people you want. The list saves these filters, so it keeps matching
            new signups after you save it.
          </Typography>
          <AudiencePicker
            filters={filters}
            onFiltersChange={setFilters}
            onCountChange={setMatched}
          />
        </Stack>
      </Box>

      {step === 1 && (
        <AudienceListForm
          owners={owners}
          loadingOwners={loadingOwners}
          defaultOwnerId={defaultOwnerId}
          error={error}
          onSubmit={save}
        />
      )}

      {confirmingLeave && (
        <ConfirmDialog
          open
          title="Leave without saving?"
          message={`You have ${filterCount} filter${filterCount === 1 ? '' : 's'} applied. Leaving now discards them and no list is created.`}
          confirmLabel="Discard filters"
          confirmColor="error"
          onClose={() => setConfirmingLeave(false)}
          onConfirm={backToLists}
        />
      )}
    </Box>
  );
}
