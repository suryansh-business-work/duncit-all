import { XStack } from 'tamagui';

import { AccountButton } from '@/components/AccountButton';
import { AuthLogo } from '@/components/AuthLogo';
import { LogoutButton } from '@/components/LogoutButton';
import { Mascot } from '@/components/Mascot';
import { ThemeToggle } from '@/components/ThemeToggle';

/**
 * In-app header — the two dynamic brand marks (logo + mascot, both from the
 * shared `branding` setting) on the left. On the right: theme toggle plus either
 * the account avatar (which opens the sidebar drawer) or — when `minimal`, i.e.
 * the pre-onboarding survey — a plain logout button.
 */
export function AppHeader({ minimal = false }: { minimal?: boolean }) {
  return (
    <XStack
      testID="app-header"
      alignItems="center"
      justifyContent="space-between"
      paddingHorizontal={16}
      paddingVertical={8}
    >
      <XStack alignItems="center" gap={8}>
        <AuthLogo size={34} />
        <Mascot />
      </XStack>
      <XStack alignItems="center" gap={8}>
        <ThemeToggle />
        {minimal ? <LogoutButton /> : <AccountButton />}
      </XStack>
    </XStack>
  );
}
