import { Stack } from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { DuncitButton, TOUCH_TARGET } from '@duncit/buttons';
import { useColorMode } from '../ColorModeContext';
import { useTranslation } from '../i18n/useTranslation';

interface SegmentProps {
  label: string;
  hint: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
  testId: string;
}

/**
 * One half of the switch. Hoisted to module scope (S6478) so the two segments
 * cannot disagree about what the active state looks like.
 */
function ModeSegment({ label, hint, icon, active, onClick, testId }: Readonly<SegmentProps>) {
  return (
    <DuncitButton
      type="button"
      onClick={onClick}
      startIcon={icon}
      aria-label={hint}
      aria-pressed={active}
      data-testid={testId}
      sx={{
        minHeight: TOUCH_TARGET - 8,
        px: 2,
        borderRadius: '999px',
        textTransform: 'none',
        fontWeight: 700,
        fontSize: 13,
        color: active ? 'text.primary' : 'text.secondary',
        bgcolor: active ? 'background.paper' : 'transparent',
        boxShadow: active ? '0 2px 6px rgba(0,0,0,0.22)' : 'none',
        '& .MuiSvgIcon-root': { fontSize: 16, color: active ? 'primary.main' : 'text.secondary' },
        '&:hover': { bgcolor: active ? 'background.paper' : 'action.hover' },
      }}
    >
      {label}
    </DuncitButton>
  );
}

/**
 * Light/dark, at the foot of every auth screen.
 *
 * A signed-out person has no sidebar, so the choice that decides whether the
 * copy over an admin's login backdrop reads was locked behind the login screen.
 * Native's twin is `app/mobile-app/src/components/AuthModeToggle` and both
 * render the same two named segments (rule 27) — named rather than a bare icon
 * because it is the first control a signed-out person meets.
 *
 * There are exactly two modes, so clicking the one that is not active is the
 * context's `toggle()`; the active half is inert.
 */
export default function AuthModeToggle() {
  const { t } = useTranslation();
  const colorMode = useColorMode();
  const isDark = colorMode.mode === 'dark';
  const noop = () => undefined;
  const pickLight = isDark ? colorMode.toggle : noop;
  const pickDark = isDark ? noop : colorMode.toggle;

  return (
    <Stack
      direction="row"
      spacing={0.5}
      data-testid="auth-mode-toggle"
      sx={{
        alignItems: 'center',
        alignSelf: 'center',
        p: 0.5,
        borderRadius: '999px',
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.default',
      }}
    >
      <ModeSegment
        testId="auth-mode-light"
        label={t('mweb.auth.themeLight')}
        hint={t('mweb.auth.switchToLight')}
        icon={<LightModeIcon />}
        active={!isDark}
        onClick={pickLight}
      />
      <ModeSegment
        testId="auth-mode-dark"
        label={t('mweb.auth.themeDark')}
        hint={t('mweb.auth.switchToDark')}
        icon={<DarkModeIcon />}
        active={isDark}
        onClick={pickDark}
      />
    </Stack>
  );
}
