import type { ReactNode } from 'react';
import { Avatar, Badge, Box, Stack, Tooltip, Typography } from '@mui/material';
import { DuncitIconButton } from '@duncit/buttons';
import HeaderNotificationsBell from './HeaderNotificationsBell';
import HeaderSearchButton from './HeaderSearchButton';
import { initials, normalizeMe } from '@duncit/user-core';
import { useTranslation } from '../../i18n/useTranslation';

/** A labelled circular header action (mock): the button with a tiny caption. */
function QuickAction({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <Stack
      spacing={0.1}
      sx={{
        alignItems: "center",
        flex: '0 0 auto'
      }}>
      {children}
      <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'text.secondary', lineHeight: 1 }}>
        {label}
      </Typography>
    </Stack>
  );
}

interface Props {
  /** Search hides outside the USER studio (focused partner headers). */
  showSearch: boolean;
  locationId: string;
  zoneName: string;
  onToast: (t: { title?: string; body?: string } | null) => void;
  // `user_id` is what `normalizeMe` keys on — an account without one is a
  // malformed answer, not an anonymous visitor, and the avatar falls back.
  me?: {
    user_id?: string | null;
    full_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    profile_photo?: string | null;
  } | null;
  onOpenMenu: () => void;
}

/**
 * The header's right-side cluster (mock): labelled circular actions — Search,
 * Alerts — then the avatar with its online dot. Extracted from AppHeader
 * (which is over the line cap) and keeps every tour anchor in place.
 *
 * The cart used to sit between them and no longer does: it is a bottom-bar
 * destination now, so the header would have been a second door to the same
 * page, appearing and disappearing as the basket filled.
 */
export default function HeaderQuickActions({
  showSearch,
  locationId,
  zoneName,
  onToast,
  me,
  onOpenMenu,
}: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <>
      {showSearch && (
        <QuickAction label={t('mweb.home.actionSearch')}>
          <HeaderSearchButton locationId={locationId} zoneName={zoneName} />
        </QuickAction>
      )}
      <QuickAction label={t('mweb.home.actionAlerts')}>
        <Box data-tour="home-notifications" component="span" sx={{ display: 'inline-flex' }}>
          <HeaderNotificationsBell onToast={onToast} />
        </Box>
      </QuickAction>
      <Tooltip title={me?.full_name ?? 'Account'}>
        <DuncitIconButton
          onClick={onOpenMenu}
          data-tour="home-profile"
          sx={{ p: 0.25, minWidth: 44, minHeight: 44 }}
          aria-label={t('mweb.common.openAccountMenu')}
        >
          <Badge
            overlap="circular"
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            variant="dot"
            sx={{
              '& .MuiBadge-dot': {
                bgcolor: 'success.main',
                border: '2px solid',
                borderColor: 'background.paper',
                width: 11,
                height: 11,
                borderRadius: '50%',
              },
            }}
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
              {initials(normalizeMe(me))}
            </Avatar>
          </Badge>
        </DuncitIconButton>
      </Tooltip>
    </>
  );
}
