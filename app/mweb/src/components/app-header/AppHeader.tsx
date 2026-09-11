import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useUserData } from '@duncit/user-context';
import { AppBar, Toolbar } from '@mui/material';
import HeaderGreeting from './HeaderGreeting';
import HeaderLeading from './HeaderLeading';
import HeaderQuickActions from './HeaderQuickActions';
import HeaderToast from './HeaderToast';
import HeaderVerifyEmail from './HeaderVerifyEmail';
import LocationDialog from './LocationDialog';
import StudioSwitchDialog from './profile-drawer/StudioSwitchDialog';
import SuperCategoryTabs from './SuperCategoryTabs';
import { useHeaderLocation } from './useHeaderLocation';
import { useHeaderQueries } from './useHeaderQueries';
import { APP_SHELL_MAX_WIDTH } from '../../app/appLayout';
import SurveyHeaderActions from './SurveyHeaderActions';
import { useStudioMode } from '../../StudioModeContext';
import { useAutoPodCounts } from '../../hooks/useAutoPodCounts';
import { resolveMode, studioSwitchPath } from '../../studio-mode';
import { useProductVisibility } from '@duncit/app-settings';

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
  const { pathname } = useLocation();
  const { logout: ctxLogout } = useUserData();
  // The account menu is its own page (/menu) — opening it is a normal push, so
  // Back returns here and a refresh keeps the user on the menu.
  const openMenu = () => navigate('/menu');
  const { staticData, staticLoading, me, meSettled, placeReady } = useHeaderQueries();
  const [toast, setToast] = useState<{ title?: string; body?: string } | null>(null);
  const { mode: studioMode, setMode: setStudioMode } = useStudioMode();
  const { visible: showProducts } = useProductVisibility();
  const [studioSwitchOpen, setStudioSwitchOpen] = useState(false);

  const branding = staticData?.branding;
  const effectiveStudio = resolveMode(studioMode, me?.roles ?? [], { products: showProducts });
  // Home leads with its own search bar and greets the user; every other page
  // keeps the header's search button and skips the greeting. The survey
  // header (`minimal`) keeps its greeting — it is all that header says.
  const onHome = pathname === '/';
  const isUserStudio = effectiveStudio === 'USER';
  const showGreeting = minimal || (isUserStudio && onHome);
  // The shared <UserProvider> auto-mounts a global "User data not loaded"
  // dialog when the `me` query fails, so we no longer render a local one
  // here. Keeping `me`/`loading` for the rest of the header's logic.
  const superCats = staticData?.superCategories ?? [];
  const locations = staticData?.locations ?? [];
  const superCategoryValue = selectedSuperCategory || superCats[0]?.slug || '';
  // Mounted with the header — the whole point of the counts is that the role
  // switch never waits on a network round trip to decide where to land.
  const autoPods = useAutoPodCounts(me?.roles ?? []);

  // The location default, picker draft and window events. Called before the
  // super-category default below so both defaults land in one commit.
  const loc = useHeaderLocation({
    me,
    meSettled,
    locations,
    selectedLocationId,
    selectedZoneName,
    onLocationChange,
    onZoneChange,
  });

  useEffect(() => {
    if (meSettled && !selectedSuperCategory && superCats.length > 0) {
      onSuperCategoryChange(superCats[0].slug);
    }
  }, [meSettled, superCats, selectedSuperCategory, onSuperCategoryChange]);

  const logout = () => {
    ctxLogout();
  };

  const handleNotifToast = useCallback(
    (t: { title?: string; body?: string } | null) => setToast(t),
    []
  );

  // The page ground, opaque: the content scrolls in its own container below
  // the bar, so a blur here had nothing to blur.
  return (
    <AppBar
      position="sticky"
      color="inherit"
      elevation={0}
      sx={{ bgcolor: 'background.default', backgroundImage: 'none', border: 0 }}
    >
      <Toolbar
        variant="dense"
        disableGutters
        sx={{
          width: '100%',
          maxWidth: APP_SHELL_MAX_WIDTH,
          mx: 'auto',
          gap: 1,
          px: 2,
          pt: 1,
          pb: showGreeting ? 1 : 1.5,
          minHeight: 56,
          boxSizing: 'border-box',
        }}
      >
        <HeaderLeading
          minimal={minimal}
          studio={effectiveStudio}
          onOpenStudioSwitch={() => {
            autoPods.reload();
            setStudioSwitchOpen(true);
          }}
          selectedLocationName={loc.selectedLocation?.location_name}
          selectedZoneName={selectedZoneName}
          placeReady={placeReady}
          onOpenLocation={loc.openLocationPicker}
        />

        {minimal ? (
          <SurveyHeaderActions onLogout={logout} />
        ) : (
          <>
            {/* Studio modes (Host/Venue/ecomm) get a focused header — no search.
             * The location picker is NOT one of the things they lose. */}
            <LocationDialog
              {...loc.dialog}
              locations={locations}
              activeLocationIds={staticData?.activePodLocationIds ?? []}
            />

            {/* Round actions: Search (not on Home) · Alerts · avatar with
             * online dot. The cart is a bottom-bar destination, not a header
             * action. */}
            <HeaderQuickActions
              showSearch={isUserStudio && !onHome}
              locationId={selectedLocationId}
              zoneName={selectedZoneName}
              onToast={handleNotifToast}
              me={me}
              onOpenMenu={openMenu}
            />
            <StudioSwitchDialog
              open={studioSwitchOpen}
              roles={me?.roles ?? []}
              showProducts={showProducts}
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

      {showGreeting && (
        <HeaderGreeting
          tagline={branding?.home_header_tagline}
          firstName={me?.first_name}
          onOpenLocation={minimal ? undefined : loc.openLocationPicker}
        />
      )}

      {!minimal && me?.email && me.is_email_verified === false && (
        <HeaderVerifyEmail onOpen={() => navigate('/profile?verifyEmail=1')} />
      )}

      {!minimal && (
        <SuperCategoryTabs
          loading={staticLoading}
          superCats={superCats}
          value={superCategoryValue}
          onChange={onSuperCategoryChange}
        />
      )}

      {!minimal && <HeaderToast toast={toast} onClose={() => setToast(null)} />}
    </AppBar>
  );
}
