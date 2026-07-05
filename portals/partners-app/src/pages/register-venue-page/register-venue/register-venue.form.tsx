import { Alert, Box, Button, Card, CardContent, Stack } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SaveIcon from '@mui/icons-material/Save';
import SectionRail from '../sections/SectionRail';
import VenueDetailsSection from '../sections/VenueDetailsSection';
import VenueTypeCapacitySection from '../sections/VenueTypeCapacitySection';
import AmenitiesSection from '../sections/AmenitiesSection';
import DocumentsSection from '../sections/DocumentsSection';
import OwnerSection from '../sections/OwnerSection';
import LeavesSection from '../sections/LeavesSection';
import ReviewSection from '../sections/ReviewSection';
import { useRegisterVenueForm, type EditableSectionKey } from './useRegisterVenueForm';
import type { RegisterVenueMode, VenueRegistrationConfig } from './register-venue.types';

interface Props {
  venue: any | null;
  locations: any[];
  account: { name: string; email: string };
  config: VenueRegistrationConfig;
  mode: RegisterVenueMode;
  onPersisted: () => Promise<unknown>;
  onSubmitted: (venueId: string) => void;
}

/** Sections with a save action in the sticky bar ('leaves' saves itself,
 * 'review' submits, amenities are locked post-approval). */
const APPROVED_SAVABLE = new Set(['details', 'type-capacity', 'documents', 'owner']);

export default function RegisterVenueForm({
  venue,
  locations,
  account,
  config,
  mode,
  onPersisted,
  onSubmitted,
}: Readonly<Props>) {
  const { form, active, setActive, error, saved, busy, venueId, sectionState, saveSection, saveApprovedSection, submitAll } =
    useRegisterVenueForm({ venue, locations, account, mode, onPersisted });

  const viewOnly = mode === 'view';
  const showRegisterBar = mode === 'register' && active !== 'leaves';
  const showApprovedBar = mode === 'edit-approved' && APPROVED_SAVABLE.has(active);

  return (
    <Box sx={{ display: { md: 'flex' }, alignItems: 'flex-start', gap: 3 }}>
      <SectionRail active={active} sectionState={sectionState} onSelect={setActive} mode={mode} />
      <Card variant="outlined" sx={{ borderRadius: 2, flex: 1, minWidth: 0 }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <fieldset
            disabled={viewOnly}
            aria-disabled={viewOnly}
            style={{
              border: 0,
              padding: 0,
              margin: 0,
              minInlineSize: 'auto',
              // The native disabled fieldset covers real inputs; pointer-events
              // also neutralises MUI's div-based Select/Chip controls.
              pointerEvents: viewOnly ? 'none' : undefined,
            }}
          >
            {active === 'details' && <VenueDetailsSection form={form} mode={mode} />}
            {active === 'type-capacity' && <VenueTypeCapacitySection form={form} config={config} mode={mode} />}
            {active === 'amenities' && (
              <AmenitiesSection form={form} config={config} disabled={mode === 'edit-approved'} />
            )}
            {active === 'documents' && (
              <DocumentsSection
                form={form}
                config={config}
                mode={mode}
                lockedDocCount={venue?.documents?.length ?? 0}
              />
            )}
            {active === 'owner' && <OwnerSection form={form} accountEmail={account.email} />}
            {active === 'leaves' && (
              <LeavesSection
                venueId={venueId}
                holidays={venue?.settings?.holidays ?? []}
                disabled={viewOnly}
                onSaved={onPersisted}
              />
            )}
            {active === 'review' && <ReviewSection form={form} />}
          </fieldset>
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
          {saved && !error && (
            <Alert severity="success" sx={{ mt: 2 }}>
              {saved}
            </Alert>
          )}
          {(showRegisterBar || showApprovedBar) && (
            <Stack
              direction="row"
              spacing={1.25}
              mt={3}
              sx={{
                position: 'sticky',
                bottom: 12,
                zIndex: 2,
                p: 1,
                mx: -0.75,
                borderRadius: 2,
                bgcolor: 'background.paper',
                border: 1,
                borderColor: 'divider',
                boxShadow: 4,
              }}
            >
              <SaveBar
                mode={mode}
                active={active as EditableSectionKey | 'review'}
                busy={busy}
                onSave={() => void saveSection(active as EditableSectionKey)}
                onSaveApproved={() => void saveApprovedSection(active as EditableSectionKey)}
                onSubmit={() => {
                  submitAll()
                    .then((id) => {
                      if (id) onSubmitted(id);
                    })
                    .catch(() => undefined);
                }}
              />
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

interface SaveBarProps {
  mode: RegisterVenueMode;
  active: EditableSectionKey | 'review';
  busy: boolean;
  onSave: () => void;
  onSaveApproved: () => void;
  onSubmit: () => void;
}

function SaveBar({ mode, active, busy, onSave, onSaveApproved, onSubmit }: Readonly<SaveBarProps>) {
  if (mode === 'edit-approved') {
    return (
      <Button
        variant="contained"
        size="large"
        startIcon={<SaveIcon />}
        disabled={busy}
        onClick={onSaveApproved}
        sx={{ flex: 1, borderRadius: 1, fontWeight: 800 }}
      >
        Save changes
      </Button>
    );
  }
  if (active === 'review') {
    return (
      <Button
        variant="contained"
        size="large"
        endIcon={<SendIcon />}
        disabled={busy}
        onClick={onSubmit}
        sx={{ flex: 1, borderRadius: 1, fontWeight: 800 }}
      >
        Submit for review
      </Button>
    );
  }
  return (
    <Button
      variant="contained"
      size="large"
      startIcon={<SaveIcon />}
      disabled={busy}
      onClick={onSave}
      sx={{ flex: 1, borderRadius: 1, fontWeight: 800 }}
    >
      Save & continue
    </Button>
  );
}
