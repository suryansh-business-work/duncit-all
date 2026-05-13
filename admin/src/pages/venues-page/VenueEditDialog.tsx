import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
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
import { selectedLocation } from '../../components/admin-venue-create-dialog/VenueLocationFields';
import {
  LOCATIONS_FOR_VENUE,
  blankS1,
  blankS3,
  type DocEntry,
  type Step1,
  type Step3,
} from '../../components/admin-venue-create-dialog/queries';
import {
  collectVenueValidationErrors,
  validateVenueEdit,
  type VenueValidationErrors,
} from '../../components/admin-venue-create-dialog/venue.form';
import { STATUSES, UPDATE_VENUE } from './queries';

interface Props {
  venue: any | null;
  onClose: () => void;
  onSaved: () => void;
}

const dateOnly = (value?: string | null) =>
  value ? new Date(value).toISOString().slice(0, 10) : '';

const hydrateLocation = (base: Step1, locations: any[]): Step1 => {
  const location = selectedLocation(locations, base);
  const zones = location?.location_zones ?? [];
  const zone = zones.find(
    (item: any) => item.zone_name === base.locality || item.zone_code === base.locality,
  );
  return {
    ...base,
    location_id: base.location_id || location?.id || '',
    country: location?.country || base.country,
    country_code: location?.country_code || base.country_code,
    state: location?.state || base.state,
    state_code: location?.state_code || base.state_code,
    city: location ? location.city || location.location_name : base.city,
    locality:
      zone?.zone_name ||
      base.locality ||
      (location && zones.length === 0 ? location.city || location.location_name : ''),
    postal_code: zone?.pincode || location?.location_pincode || base.postal_code,
  };
};

export default function VenueEditDialog({ venue, onClose, onSaved }: Props) {
  const [s1, setS1] = useState<Step1>(blankS1);
  const [docs, setDocs] = useState<DocEntry[]>([]);
  const [s2, setS2] = useState({ gstin: '', pan: '' });
  const [s3, setS3] = useState<Step3>(blankS3);
  const [status, setStatus] = useState('APPROVED');
  const [submitError, setSubmitError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<VenueValidationErrors>({});
  const [updateVenue, state] = useMutation(UPDATE_VENUE);
  const { data: locationsData } = useQuery(LOCATIONS_FOR_VENUE, { skip: !venue });

  useEffect(() => {
    if (!venue) return;
    const locations = locationsData?.locations ?? [];
    const baseS1 = {
      venue_name: venue.venue_name ?? '',
      venue_type: venue.venue_type ?? 'Cafe',
      capacity: venue.capacity ?? 1,
      description: venue.description ?? '',
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
      tags: venue.tags ?? [],
    };
    setS1(hydrateLocation(baseS1, locations));
    setDocs((venue.documents ?? []).map((doc: any) => ({ type: doc.type, url: doc.url })));
    setS2({ gstin: venue.gstin ?? '', pan: venue.pan ?? '' });
    setS3({
      owner_name: venue.owner_name ?? '',
      owner_email: venue.owner_email ?? '',
      owner_phone: venue.owner_phone ?? '',
      owner_dob: dateOnly(venue.owner_dob),
      owner_address: venue.owner_address ?? '',
    });
    setStatus(venue.status ?? 'APPROVED');
    setSubmitError('');
    setFieldErrors({});
  }, [venue, locationsData]);

  const save = async () => {
    if (!venue) return;
    const step1 = { ...s1, capacity: Number(s1.capacity) || 1 };
    const step2 = {
      documents: docs.filter((doc) => doc.type && doc.url),
      gstin: s2.gstin.trim().toUpperCase(),
      pan: s2.pan.trim().toUpperCase(),
    };
    const payload = { step1, step2, step3: s3, status };
    try {
      await validateVenueEdit(payload);
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
            locations={locationsData?.locations ?? []}
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
