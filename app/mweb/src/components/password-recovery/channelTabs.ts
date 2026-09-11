/**
 * The Email | Phone picker drawn as a calm segmented pill: a surface track, the
 * chosen half filled green. Spread onto `<DuncitTabs sx>` with
 * `variant="fullWidth"` — the sign-in password step and the recovery/OTP
 * channel step both render it. Native twin: the `ChannelToggle` in
 * forms/login/login.form.tsx and components/password-recovery.
 *
 * `minHeight` is explicit so the coarse-pointer 44px rule (theme.ts) does not
 * blow a 40px segment up inside a 48px track.
 */
export const CHANNEL_TABS_SX = {
  minHeight: 48,
  p: 0.5,
  borderRadius: '999px',
  bgcolor: 'background.paper',
  border: '1px solid var(--duncit-card-border)',
  '& .MuiTabs-indicator': { display: 'none' },
  '& .MuiTabs-flexContainer': { gap: 0.5 },
  '& .MuiTab-root': {
    minHeight: 40,
    borderRadius: '999px',
    color: 'text.primary',
    fontSize: 14,
    fontWeight: 600,
  },
  '& .MuiTab-root.Mui-selected': { bgcolor: 'primary.main', color: 'primary.contrastText' },
} as const;
