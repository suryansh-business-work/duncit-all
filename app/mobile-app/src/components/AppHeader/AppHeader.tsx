import { XStack } from 'tamagui';

import { AccountButton } from '@/components/AccountButton';
import { AuthLogo } from '@/components/AuthLogo';
import { LocationButton } from '@/components/LocationButton';
import { LogoutButton } from '@/components/LogoutButton';
import { Mascot } from '@/components/Mascot';
import { NotificationsBell } from '@/components/notifications';
import { ThemeToggle } from '@/components/ThemeToggle';

/**
 * In-app header — the two dynamic brand marks (logo + mascot, both from the
 * shared `branding` setting) on the left. On the right: theme toggle plus either
 * the account avatar (which opens the sidebar drawer) or — when `minimal`, i.e.
 * the pre-onboarding survey — a plain logout button.
 */
export function AppHeader({ minimal = false }: Readonly<{ minimal?: boolean }>) {
  return (
    <XStack
      testID="app-header"
      alignItems="center"
      justifyContent="space-between"
      paddingLeft={8}
      paddingRight={16}
      paddingVertical={8}
    >
      <XStack alignItems="center" gap={6}>
        <AuthLogo size={34} />
        <Mascot />
      </XStack>
      <XStack alignItems="center" gap={8}>
        {minimal ? null : <LocationButton />}
        {minimal ? null : <NotificationsBell />}
        <ThemeToggle />
        {minimal ? <LogoutButton /> : <AccountButton />}
      </XStack>
    </XStack>
  );
}
