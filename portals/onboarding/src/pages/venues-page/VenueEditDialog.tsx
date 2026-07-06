import { useEffect, useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import VenueAccordionForm from '../../components/admin-venue-create-dialog/VenueAccordionForm';
import {
  blankS1,
  blankS3,
  type DocEntry,
  type Step1,
  type Step3,
  type VenueCategoryValue,
} from '../../components/admin-venue-create-dialog/queries';
import {
  collectVenueValidationErrors,
  validateVenueEdit,
  type VenueValidationErrors,
} from '../../components/admin-venue-create-dialog/venue.form';
import { normalizeBankAccountValues } from '../../forms/validation/bankAccount';
import { STATUSES, UPDATE_VENUE } from './queries';

interface Props {
  venue: any | null;
  onClose: () => void;
  onSaved: () => void;
}

const dateOnly = (value?: string | null) =>
  value ? new Date(value).toISOString().slice(0, 10) : '';

const hydrateCategory = (venueCategory: any): VenueCategoryValue => ({
  super_category_id: venueCategory?.super_category_id ?? '',
  super_category_name: venueCategory?.super_category_name ?? '',
  category_id: venueCategory?.category_id ?? '',
  category_name: venueCategory?.category_name ?? '',
  sub_category_id: venueCategory?.sub_category_id ?? '',
  sub_category_name: venueCategory?.sub_category_name ?? '',
});

const isCompleteCategory = (c: VenueCategoryValue) =>
  !!(c.super_category_id && c.category_id && c.sub_category_id);

export default function VenueEditDialog({ venue, onClose, onSaved }: Readonly<Props>) {
  const [s1, setS1] = useState<Step1>(blankS1);
  const [docs, setDocs] = useState<DocEntry[]>([]);
  const [s2, setS2] = useState({ gstin: '', pan: '' });
  const [s3, setS3] = useState<Step3>(blankS3);
  const [status, setStatus] = useState('APPROVED');
  const [submitError, setSubmitError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<VenueValidationErrors>({});
  const [updateVenue, state] = useMutation(UPDATE_VENUE);

  useEffect(() => {
    if (!venue) return;
    setS1({
      venue_name: venue.venue_name ?? '',
      venue_type: venue.venue_type ?? 'Cafe',
      capacity: venue.capacity ?? 1,
      description: venue.description ?? '',
      amenities: venue.amenities ?? [],
      facilities: venue.facilities ?? [],
      security: venue.security ?? [],
      cover_image_url: venue.cover_image_url ?? '',
      gallery: venue.gallery ?? [],
      address_line1: venue.address_line1 ?? '',
      address_line2: venue.address_line2 ?? '',
      location_id: venue.location_id ?? '',
      country: venue.country ?? 'India',
      country_code: venue.country_code ?? 'IN',
      city: venue.city ?? '',
      state: venue.state ?? '',
      state_code: venue.state_code ?? '',
      locality: venue.locality ?? '',
      postal_code: venue.postal_code ?? '',
      venue_category: hydrateCategory(venue.venue_category),
      tags: venue.tags ?? [],
    });
    setDocs((venue.documents ?? []).map((doc: any) => ({ type: doc.type, url: doc.url })));
    setS2({ gstin: venue.gstin ?? '', pan: venue.pan ?? '' });
    setS3({
      owner_name: venue.owner_name ?? '',
      owner_email: venue.owner_email ?? '',
      owner_phone: venue.owner_phone ?? '',
      owner_dob: dateOnly(venue.owner_dob),
      owner_address: venue.owner_address ?? '',
      bank_account: normalizeBankAccountValues(venue.bank_account),
    });
    setStatus(venue.status ?? 'APPROVED');
    setSubmitError('');
    setFieldErrors({});
  }, [venue]);

  const save = async () => {
    if (!venue) return;
    // Send only the id triple (VenueCategoryInput) when complete; the spread's
    // 6-field venue_category is overwritten so the name fields never reach the API.
    const category = isCompleteCategory(s1.venue_category)
      ? {
          super_category_id: s1.venue_category.super_category_id,
          category_id: s1.venue_category.category_id,
          sub_category_id: s1.venue_category.sub_category_id,
        }
      : undefined;
    const step1 = { ...s1, capacity: Number(s1.capacity) || 1, venue_category: category };
    const step2 = {
      documents: docs.filter((doc) => doc.type && doc.url),
      gstin: s2.gstin.trim().toUpperCase(),
      pan: s2.pan.trim().toUpperCase(),
    };
    const payload = { step1, step2, step3: s3, status };
    try {
      await validateVenueEdit({ ...payload, step1: s1 });
    } catch (validationError) {
      setFieldErrors(collectVenueValidationErrors(validationError));
      return;
    }
    try {
      await updateVenue({ variables: { id: venue.id, ...payload } });
      onSaved();
      onClose();
    } catch (err: any) {
      setSubmitError(err.errors?.[0] || err.message || 'Failed');
    }
  };

  return (
    <Dialog open={!!venue} onClose={state.loading ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle>Edit Venue</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {submitError && <Alert severity="error">{submitError}</Alert>}
          <VenueAccordionForm
            mode="edit"
            s1={s1}
            setS1={setS1}
            docs={docs}
            setDocs={setDocs}
            s2={s2}
            setS2={setS2}
            s3={s3}
            setS3={setS3}
            errors={fieldErrors}
          />
          <TextField
            select
            label="Status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            sx={{ maxWidth: 280 }}
          >
            {STATUSES.filter(Boolean).map((item) => (
              <MenuItem key={item} value={item}>
                {item}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={state.loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={save}
          disabled={state.loading}
          startIcon={state.loading ? <CircularProgress size={14} /> : undefined}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
