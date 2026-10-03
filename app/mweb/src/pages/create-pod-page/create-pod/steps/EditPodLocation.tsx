import { useState } from 'react';
import EditLocationIcon from '@mui/icons-material/EditLocationAltOutlined';
import { DuncitButton } from '@duncit/buttons';
import LocationDialog from '../../../../components/app-header/LocationDialog';
import { useTranslation } from '../../../../i18n/useTranslation';
import { applyPodLocation } from '../create-pod.location';
import type { CreatePodForm, CreatePodLocation } from '../create-pod.types';

interface Props {
  form: CreatePodForm;
  locations: CreatePodLocation[];
}

/**
 * Step 1's "Edit location" beside Locality: opens the app's common location
 * picker and puts the pick into THIS pod (city, plus the area when one was
 * chosen) — the header stays as it was and the rest of the form is kept.
 * Native twin: steps/EditPodLocation (rule 27).
 */
export default function EditPodLocation({ form, locations }: Readonly<Props>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [draftLocationId, setDraftLocationId] = useState('');
  const [draftZone, setDraftZone] = useState('');

  const openPicker = () => {
    setDraftLocationId(form.getValues('location_id'));
    setDraftZone(form.getValues('locality'));
    setOpen(true);
  };
  const apply = (locationId: string, zone: string) => {
    applyPodLocation(form, locationId, zone);
    setOpen(false);
  };

  return (
    <>
      <DuncitButton
        data-testid="create-pod-edit-location"
        variant="text"
        size="small"
        startIcon={<EditLocationIcon fontSize="small" />}
        onClick={openPicker}
      >
        {t('mweb.createPod.editLocation')}
      </DuncitButton>
      <LocationDialog
        open={open}
        onClose={() => setOpen(false)}
        locations={locations}
        draftLocationId={draftLocationId}
        setDraftLocationId={setDraftLocationId}
        draftZone={draftZone}
        setDraftZone={setDraftZone}
        onApply={() => apply(draftLocationId, draftZone)}
        onAutoApply={apply}
      />
    </>
  );
}
