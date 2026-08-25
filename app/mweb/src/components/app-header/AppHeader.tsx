import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { useUserData } from '@duncit/user-context';
import { Alert, AppBar, Box, Chip, Stack, Toolbar } from '@mui/material';
import { HEADER_DATA, OPEN_LOCATION_PICKER_EVENT, SET_MY_SELECTED_LOCATION } from './queries';
import HeaderGreeting from './HeaderGreeting';
import HeaderLocationRow from './HeaderLocationRow';
import HeaderQuickActions from './HeaderQuickActions';
import HeaderToast from './HeaderToast';
import LocationDialog from './LocationDialog';
import StudioSwitchDialog from './profile-drawer/StudioSwitchDialog';
import SuperCategoryTabs from './SuperCategoryTabs';
import { APP_SHELL_MAX_WIDTH } from '../../app/appLayout';
import SurveyHeaderActions from './SurveyHeaderActions';
import { useStudioMode } from '../../StudioModeContext';
import { useAutoPodCounts } from '../../hooks/useAutoPodCounts';
import { STUDIO_LABEL, resolveMode, studioSwitchPath } from '../../studio-mode';

interface AppHeaderProps {
  minimal?: boolean;
  selectedSuperCategory: string;
  onSuperCategoryChange: (slug: string) => void;
  selectedLocationId: string;
  onLocationChange: (id: string) => void;
  selectedZoneName: string;
  onZoneChange: (zone: string) => void;
}

export default function AppHeader({
  minimal = false,
  selectedSuperCategory,
  onSuperCategoryChange,
  selectedLocationId,
  onLocationChange,
  selectedZoneName,
  onZoneChange,
}: Readonly<AppHeaderProps>) {
  const navigate = useNavigate();
  const { logout: ctxLogout } = useUserData();
  // The account menu is its own page (/menu) — opening it is a normal push, so
  // Back returns here and a refresh keeps the user on the menu.
  const openMenu = () => navigate('/menu');
  const { data, loading } = useQuery(HEADER_DATA, { fetchPolicy: 'cache-and-network' });
  const [persistSelectedLocation] = useMutation(SET_MY_SELECTED_LOCATION, {
    onError: () => undefined,
  });
  const [locDialogOpen, setLocDialogOpen] = useState(false);
  const [draftLocationId, setDraftLocationId] = useState('');
  const [draftZone, setDraftZone] = useState('');
  const [toast, setToast] = useState<{ title?: string; body?: string } | null>(null);
  const { mode: studioMode, setMode: setStudioMode } = useStudioMode();
  const [studioSwitchOpen, setStudioSwitchOpen] = useState(false);

  const branding = data?.branding;
  const me = data?.me;
  const effectiveStudio = resolveMode(studioMode, me?.roles ?? []);
  // The shared <UserProvider> auto-mounts a global "User data not loaded"
  // dialog when the `me` query fails, so we no longer render a local one
  // here. Keeping `me`/`loading` for the rest of the header's logic.
  const superCats = data?.superCategories ?? [];
  const locations = data?.locations ?? [];
  const superCategoryValue = selectedSuperCategory || superCats[0]?.slug || '';
  // Mounted with the header — the whole point of the counts is that the role
  // switch never waits on a network round trip to decide where to land.
  const autoPods = useAutoPodCounts(me?.roles ?? []);

  // Persist an explicit location choice so it sticks across sessions/devices.
  // The auto-default below does NOT persist — only a real user pick does.
  const persistLocation = useCallback(
    (id: string) => {
      if (!id || id === me?.selected_location_id) return;
      persistSelectedLocation({ variables: { locationId: id } }).catch(() => undefined);
    },
    [persistSelectedLocation, me?.selected_location_id]
  );

  useEffect(() => {
    if (!selectedLocationId && locations.length > 0) {
      // Prefer the user's persisted choice; then a city match; then the first.
      const persisted = locations.find((l: any) => l.id === me?.selected_location_id);
      const cityMatch = locations.find(
        (l: any) => me?.city && l.location_name?.toLowerCase() === me.city.toLowerCase()
      );
      onLocationChange(persisted?.id ?? cityMatch?.id ?? locations[0].id);
    }
  }, [locations, selectedLocationId, me, onLocationChange]);

  useEffect(() => {
    if (!selectedSuperCategory && superCats.length > 0) {
      onSuperCategoryChange(superCats[0].slug);
    }
  }, [superCats, selectedSuperCategory, onSuperCategoryChange]);

  const selectedLocation = useMemo(
    () => locations.find((l: any) => l.id === selectedLocationId),
    [locations, selectedLocationId]
  );

  const openLocationPicker = useCallback(() => {
    setDraftLocationId(selectedLocationId);
    setDraftZone(selectedZoneName);
    setLocDialogOpen(true);
  }, [selectedLocationId, selectedZoneName]);

  // Open the picker when another screen (e.g. the Clubs page note) asks for it.
  useEffect(() => {
    globalThis.addEventListener(OPEN_LOCATION_PICKER_EVENT, openLocationPicker);
    return () => globalThis.removeEventListener(OPEN_LOCATION_PICKER_EVENT, openLocationPicker);
  }, [openLocationPicker]);

  const logout = () => {
    ctxLogout();
  };

  const handleNotifToast = useCallback(
    (t: { title?: string; body?: string } | null) => setToast(t),
    []
  );

  return (
    <AppBar
      position="sticky"
      color="inherit"
      elevation={0}
      sx={{
        bgcolor: 'transparent',
        backgroundImage: 'none',
        borderBottom: 0,
        backdropFilter: 'blur(18px)',
      }}
    >
      <Toolbar sx={{ width: '100%', maxWidth: APP_SHELL_MAX_WIDTH, mx: 'auto', gap: 1, py: 0.75, minHeight: minimal ? 56 : 60, px: 1.5 }}>
        {!minimal && effectiveStudio !== 'USER' ? (
          // A studio header keeps the role badge AND the location switcher: a
          // host/venue/club account still browses a city, so the picker stays.
          <Stack
            direction="row"
            spacing={1}
            sx={{
              alignItems: "center",
              minWidth: 0
            }}>
            <Chip
              label={STUDIO_LABEL[effectiveStudio]}
              color="primary"
              size="small"
              onClick={() => {
                autoPods.reload();
                setStudioSwitchOpen(true);
              }}
              sx={{ fontWeight: 700, borderRadius: 999, flex: '0 0 auto' }}
            />
            <HeaderLocationRow
              selectedLocationName={selectedLocation?.location_name}
              selectedZoneName={selectedZoneName}
              loading={loading}
              hasData={!!data}
              onOpen={openLocationPicker}
            />
          </Stack>
        ) : (
          <HeaderGreeting
            tagline={branding?.home_header_tagline}
            loading={loading}
            hasData={!!data}
            selectedLocationName={minimal ? undefined : selectedLocation?.location_name}
            selectedZoneName={minimal ? undefined : selectedZoneName}
            onOpenLocation={minimal ? undefined : openLocationPicker}
          />
        )}

        <Box sx={{ flexGrow: 1 }} />

        {minimal ? (
          <SurveyHeaderActions onLogout={logout} />
        ) : (
          <>
            {/* Studio modes (Host/Venue/ecomm) get a focused header — no search.
             * The location picker is NOT one of the things they lose. */}
            <LocationDialog
              open={locDialogOpen}
              onClose={() => setLocDialogOpen(false)}
              locations={locations}
              activeLocationIds={data?.activePodLocationIds ?? []}
              draftLocationId={draftLocationId}
              setDraftLocationId={setDraftLocationId}
              draftZone={draftZone}
              setDraftZone={setDraftZone}
              onApply={() => {
                onLocationChange(draftLocationId);
                onZoneChange(draftZone);
                persistLocation(draftLocationId);
                setLocDialogOpen(false);
              }}
              onAutoApply={(locationId, zoneName) => {
                setDraftLocationId(locationId);
                setDraftZone(zoneName);
                onLocationChange(locationId);
                onZoneChange(zoneName);
                persistLocation(locationId);
                setLocDialogOpen(false);
              }}
            />

            {/* Labelled circular actions (mock): Search · Cart · Alerts · avatar
             * with online dot. The cart still hides itself when empty. */}
            <HeaderQuickActions
              showSearch={effectiveStudio === 'USER'}
              locationId={selectedLocationId}
              zoneName={selectedZoneName}
              onToast={handleNotifToast}
              me={me}
              onOpenMenu={openMenu}
            />
            <StudioSwitchDialog
              open={studioSwitchOpen}
              roles={me?.roles ?? []}
              current={effectiveStudio}
              onClose={() => setStudioSwitchOpen(false)}
              onSelect={(next) => {
                setStudioMode(next);
                setStudioSwitchOpen(false);
                // Jump straight to the selected role's dashboard (B3-2) — or to
                // its Auto Pod queue when one is waiting on that role.
                navigate(studioSwitchPath(next, autoPods.counts));
              }}
            />
          </>
        )}
      </Toolbar>

      {!minimal && me?.email && me.is_email_verified === false && (
        <Alert
          severity="info"
          onClick={() => navigate('/profile?verifyEmail=1')}
          sx={{
            width: '100%',
            maxWidth: APP_SHELL_MAX_WIDTH,
            mx: 'auto',
            borderRadius: 0,
            cursor: 'pointer',
            // Sits between the toolbar and the category tabs; without the
            // vertical margin it reads as part of whichever one it touches.
            my: 1,
            py: 0.75,
          }}
        >
          Please verify your email
        </Alert>
      )}

      {!minimal && (
        <SuperCategoryTabs
          loading={loading}
          superCats={superCats}
          value={superCategoryValue}
          onChange={onSuperCategoryChange}
        />
      )}

      {!minimal && <HeaderToast toast={toast} onClose={() => setToast(null)} />}
    </AppBar>
  );
}
