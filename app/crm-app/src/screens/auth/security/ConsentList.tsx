import { Checkbox, Label, Text, XStack, YStack, useTheme } from 'tamagui';
import { MaterialIcons } from '@expo/vector-icons';

import { useTranslation } from '@/hooks/useTranslation';
import type { Consent, ConsentKey } from './useSecurityVerification';

const ROWS: { key: ConsentKey; copy: string }[] = [
  { key: 'authorized_person', copy: 'shell.securityVerification.consent.authorized' },
  { key: 'credentials_not_shared', copy: 'shell.securityVerification.consent.credentials' },
  { key: 'policies_acknowledged', copy: 'shell.securityVerification.consent.policies' },
  { key: 'location_consent', copy: 'shell.securityVerification.consent.location' },
];

interface Props {
  consent: Consent;
  onChange: (next: Consent) => void;
  /** An approved alternative replaces the location consent. */
  locationNotNeeded: boolean;
}

/** The four confirmations, worded exactly as on the portal's screen. */
export function ConsentList({ consent, onChange, locationNotNeeded }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <YStack gap="$3">
      <Text fontWeight="700" role="heading">
        {t('shell.securityVerification.consent.title')}
      </Text>
      {ROWS.map(({ key, copy }) =>
        key === 'location_consent' && locationNotNeeded ? (
          <Text key={key} color="$muted">
            {t('shell.securityVerification.consent.locationNotNeeded')}
          </Text>
        ) : (
          <XStack key={key} gap="$3" alignItems="flex-start">
            <Checkbox
              id={`consent-${key}`}
              checked={consent[key]}
              onCheckedChange={(value) => onChange({ ...consent, [key]: value === true })}
              aria-label={t(copy)}
              testID={`consent-${key}`}
              size="$5"
            >
              <Checkbox.Indicator>
                <MaterialIcons name="check" size={18} color={theme.color?.val} />
              </Checkbox.Indicator>
            </Checkbox>
            <Label htmlFor={`consent-${key}`} flex={1} lineHeight="$4">
              {t(copy)}
            </Label>
          </XStack>
        ),
      )}
    </YStack>
  );
}
