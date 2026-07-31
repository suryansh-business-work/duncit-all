import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Stack, Step, StepLabel, Stepper, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useUserData } from '@duncit/user-context';
import { notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { BackHeader } from '@duncit/ui';
import AudiencePicker from './AudiencePicker';
import { AudienceListForm, type AudienceListFormValues } from './audience-list-form';
import { buildFilters, EMPTY_FILTERS, type AudienceFilterState } from './audience-filters';
import { CREATE_AUDIENCE_LIST } from './queries';

const STEPS = ['Choose the audience', 'Name the list'];

/** Two steps: define who is in the list, then say what the list is. */
export default function CreateAudienceListPage() {
  const navigate = useNavigate();
  const { user } = useUserData();
  const [step, setStep] = useState(0);
  const [filters, setFilters] = useState<AudienceFilterState>(EMPTY_FILTERS);
  const [error, setError] = useState<string | null>(null);
  const [createList, { loading: saving }] = useMutation(CREATE_AUDIENCE_LIST);

  const backToLists = () => navigate('/audience');

  const save = async (values: AudienceListFormValues) => {
    setError(null);
    try {
      await createList({
        variables: {
          input: {
            name: values.name,
            description: values.description,
            owner: values.owner,
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
      <BackHeader
        onBack={backToLists}
        backAriaLabel="Back to audience lists"
        eyebrow="Target Audience"
        title="Create list"
      />

      <Stepper activeStep={step} sx={{ my: 3, maxWidth: 520 }}>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {step === 0 && (
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Filter down to the people you want. The list saves these filters, so it keeps matching
            new signups after you save it.
          </Typography>
          <AudiencePicker filters={filters} onFiltersChange={setFilters} />
          <Stack direction="row" justifyContent="flex-end">
            <Button
              variant="contained"
              endIcon={<ArrowForwardIcon />}
              onClick={() => setStep(1)}
              data-testid="audience-step-next"
            >
              Next
            </Button>
          </Stack>
        </Stack>
      )}

      {step === 1 && (
        <AudienceListForm
          defaultOwner={user?.full_name ?? user?.email ?? ''}
          saving={saving}
          error={error}
          onBack={() => setStep(0)}
          onSubmit={save}
        />
      )}
    </Box>
  );
}
