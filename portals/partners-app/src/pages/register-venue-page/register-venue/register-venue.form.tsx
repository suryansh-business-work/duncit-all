import { Alert, Box, Button, Card, CardContent, Stack } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SaveIcon from '@mui/icons-material/Save';
import SectionRail from '../sections/SectionRail';
import VenueDetailsSection from '../sections/VenueDetailsSection';
import VenueTypeCapacitySection from '../sections/VenueTypeCapacitySection';
import DocumentsSection from '../sections/DocumentsSection';
import OwnerSection from '../sections/OwnerSection';
import ReviewSection from '../sections/ReviewSection';
import { useRegisterVenueForm } from './useRegisterVenueForm';
import type { VenueRegistrationConfig } from './register-venue.types';

interface Props {
  venue: any | null;
  locations: any[];
  account: { name: string; email: string };
  config: VenueRegistrationConfig;
  readOnly: boolean;
  onPersisted: () => Promise<unknown>;
  onSubmitted: (venueId: string) => void;
}

export default function RegisterVenueForm({
  venue,
  locations,
  account,
  config,
  readOnly,
  onPersisted,
  onSubmitted,
}: Readonly<Props>) {
  const { form, active, setActive, error, busy, sectionState, saveSection, submitAll } =
    useRegisterVenueForm({ venue, locations, account, onPersisted });

  return (
    <Box sx={{ display: { md: 'flex' }, alignItems: 'flex-start', gap: 3 }}>
      <SectionRail active={active} sectionState={sectionState} onSelect={setActive} />
      <Card variant="outlined" sx={{ borderRadius: 2, flex: 1, minWidth: 0 }}>
        <CardContent sx={{ p: { xs: 1.5, sm: 2.5 } }}>
          <fieldset
            disabled={readOnly}
            aria-disabled={readOnly}
            style={{
              border: 0,
              padding: 0,
              margin: 0,
              minInlineSize: 'auto',
              // The native disabled fieldset covers real inputs; pointer-events
              // also neutralises MUI's div-based Select/Chip controls.
              pointerEvents: readOnly ? 'none' : undefined,
            }}
          >
            {active === 'details' && <VenueDetailsSection form={form} locations={locations} />}
            {active === 'type-capacity' && <VenueTypeCapacitySection form={form} config={config} />}
            {active === 'documents' && <DocumentsSection form={form} config={config} />}
            {active === 'owner' && <OwnerSection form={form} accountEmail={account.email} />}
            {active === 'review' && <ReviewSection form={form} />}
          </fieldset>
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
          {!readOnly && (
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
              {active === 'review' ? (
                <Button
                  variant="contained"
                  size="large"
                  endIcon={<SendIcon />}
                  disabled={busy}
                  onClick={() => {
                    submitAll()
                      .then((id) => {
                        if (id) onSubmitted(id);
                      })
                      .catch(() => undefined);
                  }}
                  sx={{ flex: 1, borderRadius: 1, fontWeight: 800 }}
                >
                  Submit for review
                </Button>
              ) : (
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<SaveIcon />}
                  disabled={busy}
                  onClick={() => void saveSection(active)}
                  sx={{ flex: 1, borderRadius: 1, fontWeight: 800 }}
                >
                  Save & continue
                </Button>
              )}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
