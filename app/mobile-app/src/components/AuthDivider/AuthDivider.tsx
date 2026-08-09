import { Separator, Text, XStack } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';

/** "OR" separator matching mWeb's <Divider>OR</Divider>. Screens that separate
 * Google from the email form pass their own label ("OR EMAIL"). */
export function AuthDivider({ label }: Readonly<{ label?: string }>) {
  const { t } = useTranslation();

  return (
    <XStack alignItems="center" gap={12} testID="auth-divider">
      <Separator flex={1} borderColor="$borderColor" />
      <Text fontSize={12} fontWeight="600" color="$muted">
        {label ?? t('mweb.auth.or')}
      </Text>
      <Separator flex={1} borderColor="$borderColor" />
    </XStack>
  );
}
