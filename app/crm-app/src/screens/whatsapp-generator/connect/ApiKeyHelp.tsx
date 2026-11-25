import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack, useTheme } from 'tamagui';

import { SURFACE } from '@/components/surface';
import { RADII } from '@/constants/design';
import { useTranslation } from '@/hooks/useTranslation';

/** One numbered help step. */
function HelpStep({ n, text }: Readonly<{ n: number; text: string }>) {
  return (
    <XStack gap="$2" alignItems="flex-start">
      <YStack
        aria-hidden
        width={22}
        height={22}
        borderRadius={RADII.pill}
        backgroundColor="$primary"
        alignItems="center"
        justifyContent="center"
        marginTop="$0.5"
      >
        <Text color="$onPrimary" fontSize="$1" fontWeight="800">
          {String(n)}
        </Text>
      </YStack>
      <Text flex={1} color="$muted">
        {text}
      </Text>
    </XStack>
  );
}

/** "How do I get the API key?" under the Gateway step — the portal's accordion, closed until tapped. */
export function ApiKeyHelp() {
  const { t } = useTranslation();
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const steps = [
    t('crm.tools.apiKeyHelpGenerate'),
    t('crm.tools.apiKeyHelpDashboard'),
    t('crm.tools.apiKeyHelpSelfHosted'),
    t('crm.tools.apiKeyHelpKept'),
  ];
  return (
    <YStack {...SURFACE} gap="$3">
      <XStack
        role="button"
        aria-expanded={open}
        aria-label={t('crm.tools.howToGetApiKey')}
        onPress={() => setOpen((o) => !o)}
        alignItems="center"
        gap="$2"
        minHeight={44}
        testID="wa-api-key-help"
      >
        <MaterialIcons name="help-outline" size={20} color={theme.accentText?.val} />
        <Text flex={1} fontWeight="700">
          {t('crm.tools.howToGetApiKey')}
        </Text>
        <MaterialIcons
          name={open ? 'expand-less' : 'expand-more'}
          size={22}
          color={theme.muted?.val}
        />
      </XStack>
      {open ? (
        <YStack gap="$3" testID="wa-api-key-steps">
          {steps.map((text, i) => (
            <HelpStep key={text} n={i + 1} text={text} />
          ))}
        </YStack>
      ) : null}
    </YStack>
  );
}
