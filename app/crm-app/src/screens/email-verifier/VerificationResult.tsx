import type { ResultOf } from '@graphql-typed-document-node/core';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack, useTheme } from 'tamagui';

import { CrmAppVerifyEmailDocument } from '@/graphql/emailVerification';
import { useTranslation } from '@/hooks/useTranslation';
import { EmailStatusChip } from './EmailStatusChip';

export type Verification = ResultOf<typeof CrmAppVerifyEmailDocument>['crmVerifyEmail'];

type Flag =
  | 'is_valid_syntax'
  | 'accepts_mail'
  | 'is_deliverable'
  | 'is_catch_all'
  | 'is_disposable'
  | 'is_role_account';

/** Literal keys, the portal's own, so the localization gate sees each. */
const FLAGS: readonly { flag: Flag; key: string }[] = [
  { flag: 'is_valid_syntax', key: 'crm.emailVerifier.flagSyntax' },
  { flag: 'accepts_mail', key: 'crm.emailVerifier.flagAcceptsMail' },
  { flag: 'is_deliverable', key: 'crm.emailVerifier.flagDeliverable' },
  { flag: 'is_catch_all', key: 'crm.emailVerifier.flagCatchAll' },
  { flag: 'is_disposable', key: 'crm.emailVerifier.flagDisposable' },
  { flag: 'is_role_account', key: 'crm.emailVerifier.flagRoleAccount' },
];

/** What one check found — the verdict and the facts behind it, and a suggested spelling if there is one. */
export function VerificationResult({ result }: Readonly<{ result: Verification }>) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <YStack gap="$2" aria-live="polite" testID="email-verify-result">
      <XStack alignItems="center" gap="$2" flexWrap="wrap">
        <Text fontWeight="700" flexShrink={1}>
          {result.email}
        </Text>
        <EmailStatusChip status={result.status} />
      </XStack>
      {FLAGS.map(({ flag, key }) => (
        <XStack key={flag} alignItems="center" gap="$2">
          <MaterialIcons
            name={result[flag] ? 'check' : 'close'}
            size={18}
            color={result[flag] ? theme.success?.val : theme.muted?.val}
            accessibilityElementsHidden
          />
          <Text fontSize="$3">
            {t(key)}: {result[flag] ? t('crm.emailVerifier.yes') : t('crm.emailVerifier.no')}
          </Text>
        </XStack>
      ))}
      {result.suggestion ? (
        <Text color="$info" fontWeight="600" testID="email-verify-suggestion">
          {t('crm.emailVerifier.didYouMean', { vars: { email: result.suggestion } })}
        </Text>
      ) : null}
    </YStack>
  );
}
