import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useUserData } from '@duncit/user-context';
import { Alert, AppBar, Avatar, Box, Chip, IconButton, Toolbar, Tooltip } from '@mui/material';
import {
  HEADER_DATA,
  OPEN_LOCATION_PICKER_EVENT,
  PUBLIC_POLICIES,
  SET_MY_SELECTED_LOCATION,
} from './queries';
import HeaderGreeting from './HeaderGreeting';
import HeaderNotificationsBell from './HeaderNotificationsBell';
import HeaderSearchButton from './HeaderSearchButton';
import HeaderToast from './HeaderToast';
import LocationDialog from './LocationDialog';
import ProfileDrawer from './ProfileDrawer';
import StudioSwitchDialog from './profile-drawer/StudioSwitchDialog';
import SuperCategoryTabs from './SuperCategoryTabs';
import { APP_SHELL_MAX_WIDTH } from '../../app/appLayout';
import SurveyHeaderActions from './SurveyHeaderActions';
import { useStudioMode } from '../../StudioModeContext';
import { STUDIO_HOME_PATH, STUDIO_LABEL, resolveMode } from '../../studio-mode';

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
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { logout: ctxLogout } = useUserData();
  // The account drawer lives in URL history (?menu=open) so the browser Back
  // button closes it instead of unloading the underlying full-screen page.
  const menuOpen = searchParams.get('menu') === 'open';
  const openMenu = () => {
    const params = new URLSearchParams(location.search);
    params.set('menu', 'open');
    navigate({ search: `?${params.toString()}` });
  };
  const closeMenu = () => {
    if (!menuOpen) return;
    const idx = Number((globalThis.history.state as { idx?: number })?.idx ?? 0);
    if (idx > 0) {
      navigate(-1);
      return;
    }
    const params = new URLSearchParams(location.search);
    params.delete('menu');
    const search = params.toString();
    navigate({ search: search ? `?${search}` : '' }, { replace: true });
  };
  const { data, loading } = useQuery(HEADER_DATA, { fetchPolicy: 'cache-and-network' });
  const [persistSelectedLocation] = useMutation(SET_MY_SELECTED_LOCATION, {
    onError: () => undefined,
  });
  const [locDialogOpen, setLocDialogOpen] = useState(false);
  const [draftLocationId, setDraftLocationId] = useState('');
  const [draftZone, setDraftZone] = useState('');
  const [policiesOpen, setPoliciesOpen] = useState(false);
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

  const { data: policiesData } = useQuery(PUBLIC_POLICIES, { fetchPolicy: 'cache-first' });
  const publicPolicies = policiesData?.publicPolicies ?? [];

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
          <Chip
            label={STUDIO_LABEL[effectiveStudio]}
            color="primary"
            size="small"
            onClick={() => setStudioSwitchOpen(true)}
            sx={{ fontWeight: 900, borderRadius: 999 }}
          />
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
            {/* Studio modes (Host/Venue/ecomm) get a focused header — no location, no search. */}
            {effectiveStudio === 'USER' && (
              <>
                {/* Location now lives on the left (HeaderGreeting); search stays on the right. */}
                <HeaderSearchButton locationId={selectedLocationId} zoneName={selectedZoneName} />
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

              </>
            )}
            <HeaderNotificationsBell onToast={handleNotifToast} />

            <Tooltip title={me?.full_name ?? 'Account'}>
              <IconButton
                onClick={openMenu}
                sx={{ p: 0.25, minWidth: 44, minHeight: 44 }}
                aria-label="Open account menu"
              >
                <Avatar
                  src={me?.profile_photo || undefined}
                  sx={{
                    width: 34,
                    height: 34,
                    bgcolor: 'primary.main',
                    fontSize: 13,
                    border: 2,
                    borderColor: 'primary.main',
                    boxShadow: '0 0 0 3px rgba(255,79,115,0.24)',
                  }}
                >
                  {(me?.first_name?.[0] ?? me?.full_name?.[0] ?? 'U').toUpperCase()}
                </Avatar>
              </IconButton>
            </Tooltip>
            <ProfileDrawer
              open={menuOpen}
              onClose={closeMenu}
              me={me}
              publicPolicies={publicPolicies}
              policiesOpen={policiesOpen}
              setPoliciesOpen={setPoliciesOpen}
              onLogout={logout}
            />
            <StudioSwitchDialog
              open={studioSwitchOpen}
              roles={me?.roles ?? []}
              current={effectiveStudio}
              onClose={() => setStudioSwitchOpen(false)}
              onSelect={(next) => {
                setStudioMode(next);
                setStudioSwitchOpen(false);
                // Jump straight to the selected role's dashboard (B3-2).
                navigate(STUDIO_HOME_PATH[next]);
              }}
            />
          </>
        )}
      </Toolbar>

      {!minimal && me?.email && me.is_email_verified === false && (
        <Alert
          severity="info"
          onClick={() => navigate('/profile?verifyEmail=1')}
          sx={{ width: '100%', maxWidth: APP_SHELL_MAX_WIDTH, mx: 'auto', borderRadius: 0, cursor: 'pointer', py: 0.25 }}
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
