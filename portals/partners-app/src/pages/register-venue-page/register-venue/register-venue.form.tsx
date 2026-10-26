import { Alert, Box, Card, CardContent, Stack } from '@mui/material';
import SectionRail from '../sections/SectionRail';
import VenueDetailsSection from '../sections/VenueDetailsSection';
import DocumentsSection from '../sections/DocumentsSection';
import OwnerSection from '../sections/OwnerSection';
import PayoutMethodSection from '../sections/PayoutMethodSection';
import ReviewSection from '../sections/ReviewSection';
import { APPROVED_EDIT_SECTIONS, useRegisterVenueForm, type EditableSectionKey } from './useRegisterVenueForm';
import SaveBar from './register-venue.save-bar';
import {
  categoryLimitOf,
  foodLimitsOf,
  taxDocTypesOf,
  type RegisterVenueMode,
  type VenueRegistrationConfig,
} from './register-venue.types';
import { fireAndForget, logs } from '@duncit/logs';

interface Props {
  venue: any;
  locations: any[];
  account: { name: string; email: string };
  config: VenueRegistrationConfig;
  mode: RegisterVenueMode;
  onPersisted: () => Promise<unknown>;
  onSubmitted: (venueId: string) => void;
}

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
    useRegisterVenueForm({
      venue,
      locations,
      account,
      mode,
      taxDocTypes: taxDocTypesOf(config),
      foodLimits: foodLimitsOf(config),
      categoryLimit: categoryLimitOf(config),
      onPersisted,
    });

  const viewOnly = mode === 'view';
  const showRegisterBar = mode === 'register';
  // Payout is locked post-approval.
  const showApprovedBar = mode === 'edit-approved' && APPROVED_EDIT_SECTIONS.has(active);

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
            {active === 'details' && (
              <VenueDetailsSection
                form={form}
                mode={mode}
                categoryLimit={categoryLimitOf(config)}
                venueId={venueId ?? undefined}
                videoLimit={config.venue_video_limit}
              />
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
            {active === 'payout' && <PayoutMethodSection form={form} disabled={mode === 'edit-approved'} />}
            {active === 'review' && <ReviewSection form={form} />}
          </fieldset>
          {error && (
            <Alert severity="error" sx={{ mt: 2 }} data-testid="register-venue-error">
              {error}
            </Alert>
          )}
          {saved && !error && (
            <Alert severity="success" sx={{ mt: 2 }} data-testid="register-venue-saved">
              {saved}
            </Alert>
          )}
          {(showRegisterBar || showApprovedBar) && (
            <Stack
              direction="row"
              spacing={1.25}
              sx={{
                mt: 3,
                position: 'sticky',
                bottom: 12,
                zIndex: 2,
                p: 1,
                mx: -0.75,
                borderRadius: 2,
                bgcolor: 'background.paper',
                border: 1,
                borderColor: 'divider',
                boxShadow: 4
              }}>
              <SaveBar
                mode={mode}
                active={active as EditableSectionKey | 'review'}
                busy={busy}
                onSave={() => fireAndForget(saveSection(active as EditableSectionKey), logs.portal['partners-app'], 'register-venue', 'saveSection')}
                onSaveApproved={() => fireAndForget(saveApprovedSection(active as EditableSectionKey), logs.portal['partners-app'], 'register-venue', 'saveApprovedSection')}
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
