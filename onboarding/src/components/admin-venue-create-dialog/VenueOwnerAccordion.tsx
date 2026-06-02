import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Autocomplete,
  Box,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { blankBankAccountValues } from '../../forms/validation/bankAccount';
import VenueOwnerSection from './VenueOwnerSection';
import type { Step3 } from './queries';
import { getVenueError, type VenueValidationErrors } from './venue.form';
import type { VenueAccordionMode } from './VenueAccordionForm';

interface OwnerUser {
  user_id: string;
  full_name?: string | null;
  email?: string | null;
  phone_number?: string | null;
}

interface Props {
  mode: VenueAccordionMode;
  expanded: boolean;
  onToggle: () => void;
  s3?: Step3;
  setS3?: (next: Step3) => void;
  owner?: OwnerUser | null;
  setOwner?: (next: OwnerUser | null) => void;
  ownerOptions?: OwnerUser[];
  errors?: VenueValidationErrors;
}

export default function VenueOwnerAccordion({
  mode,
  expanded,
  onToggle,
  s3,
  setS3,
  owner,
  setOwner,
  ownerOptions,
  errors,
}: Props) {
  const handleOwnerPick = (next: OwnerUser | null) => {
    setOwner?.(next);
    if (next && setS3) {
      setS3({
        owner_name: next.full_name ?? '',
        owner_email: next.email ?? '',
        owner_phone: next.phone_number ?? '',
        owner_dob: s3?.owner_dob ?? '',
        owner_address: s3?.owner_address ?? '',
        bank_account: s3?.bank_account ?? blankBankAccountValues(),
      });
    }
  };

  return (
    <Accordion expanded={expanded} onChange={onToggle} disableGutters>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle1">Owner details</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={2}>
          {mode === 'create' && ownerOptions && setOwner && (
            <Autocomplete
              options={ownerOptions}
              getOptionLabel={(option) =>
                `${option.full_name ?? ''} · ${option.email ?? option.phone_number ?? ''}`.trim()
              }
              value={owner ?? null}
              isOptionEqualToValue={(a, b) => a.user_id === b.user_id}
              onChange={(_event, value) => handleOwnerPick(value)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Pick an existing user as owner"
                  size="small"
                  error={!!getVenueError(errors, 'owner_user_id')}
                  helperText={
                    getVenueError(errors, 'owner_user_id') ||
                    "Admin auto-fills the owner from the selected user — you don't need to retype these details."
                  }
                />
              )}
            />
          )}
          {s3 && setS3 ? (
            <VenueOwnerSection s3={s3} setS3={setS3} errors={errors} />
          ) : (
            <Box>
              <Typography variant="body2" color="text.secondary">
                Owner details are managed by the admin and saved automatically.
              </Typography>
            </Box>
          )}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}