import type { Control } from 'react-hook-form';
import { Text, YStack } from 'tamagui';

import { useDuplicateCheck } from '@/features/leads/editor/useDuplicateCheck';
import type { LeadKind } from '@/features/leads/leadKinds';
import { useTranslation } from '@/hooks/useTranslation';
import type { LeadFormValues } from './lead.types';

const FIELD_LABEL_KEY = {
  PHONE: 'crm.duplicates.fieldPhone',
  EMAIL: 'crm.duplicates.fieldEmail',
  WEBSITE: 'crm.common.website',
} as const;

interface Props {
  kind: LeadKind;
  leadId: string | null;
  control: Control<LeadFormValues>;
}

/**
 * The portal's duplicate warning: each typed phone, email or website another
 * lead already has, and which lead. A polite live region, so a screen reader
 * hears it appear; the server blocks the save as the portal does.
 */
export function DuplicateWarnings({ kind, leadId, control }: Readonly<Props>) {
  const { t } = useTranslation();
  const { matches, checking, failed } = useDuplicateCheck(kind, leadId, control);

  return (
    <YStack aria-live="polite" testID="lead-duplicates">
      {matches.length > 0 ? (
        <YStack
          gap="$1"
          padding="$3"
          borderRadius="$4"
          backgroundColor="$warningSoft"
          testID="lead-duplicates-warning"
        >
          <Text fontWeight="700">{t('crm.duplicates.title')}</Text>
          <Text>{leadId ? t('crm.duplicates.introEdit') : t('crm.duplicates.intro')}</Text>
          {matches.map((match) => (
            <Text
              key={`${match.field}:${match.value}:${match.entity_type}:${match.lead_id}`}
              fontWeight="600"
            >
              {t('crm.duplicates.match', {
                vars: {
                  field: t(FIELD_LABEL_KEY[match.field]),
                  value: match.value,
                  kind: t(`crmApp.kind.${match.entity_type}`),
                  name: match.lead_name || t('crm.duplicates.unnamed'),
                },
              })}
            </Text>
          ))}
        </YStack>
      ) : null}
      {matches.length === 0 && checking ? (
        <Text color="$muted">{t('crm.duplicates.checking')}</Text>
      ) : null}
      {failed && !checking ? (
        <Text color="$muted" role="status" testID="lead-duplicates-failed">
          {t('crm.duplicates.checkFailed')}
        </Text>
      ) : null}
    </YStack>
  );
}
