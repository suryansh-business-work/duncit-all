import { memo } from 'react';
import { Text, XStack, YStack } from 'tamagui';
import { CRM_LEAD_STATUS_TONE, crmToneOf } from '@duncit/utils';

import { LeadAvatar } from '@/components/LeadAvatar';
import { IconButton } from '@/components/mobile/IconButton';
import { SURFACE } from '@/components/surface';
import { MOBILE } from '@/constants/design';
import { ToneChip } from '@/components/ToneChip';
import type { LeadRow } from '@/features/leads/useLeadSearch';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  row: LeadRow;
  onOpen: (row: LeadRow) => void;
  /** Rings the lead's first number on the CRM call line; no button without a number. */
  onCall: (row: LeadRow, number: string) => void;
}

/**
 * One search result: initials, the name, kind and city, its status, and a
 * Call button at the thumb's side, so finding a lead and calling it is one tap.
 */
function LeadSearchRowImpl({ row, onOpen, onCall }: Readonly<Props>) {
  const { t } = useTranslation();
  const number = row.phones.find(Boolean);
  return (
    <XStack
      {...SURFACE}
      paddingVertical="$2.5"
      gap="$3"
      alignItems="center"
      role="button"
      aria-label={row.name}
      onPress={() => onOpen(row)}
      pressStyle={{ backgroundColor: '$soft' }}
      testID={`lead-row-${row.id}`}
    >
      <LeadAvatar name={row.name} size={MOBILE.avatar} />
      <YStack flex={1} gap="$1">
        <Text fontWeight="700" numberOfLines={1}>
          {row.name}
        </Text>
        <Text color="$muted" fontSize="$2" numberOfLines={1}>
          {[t(`crmApp.kind.${row.entity_type}`), row.city].filter(Boolean).join(' · ')}
        </Text>
        {row.lead_status ? (
          <XStack>
            <ToneChip
              label={row.lead_status}
              tone={crmToneOf(CRM_LEAD_STATUS_TONE, row.lead_status)}
            />
          </XStack>
        ) : null}
      </YStack>
      {number ? (
        <IconButton
          icon={{ name: 'phone' }}
          variant="filled"
          label={t('crm.leadDetail.callNumber', { vars: { number } })}
          onPress={() => onCall(row, number)}
          testID={`lead-row-call-${row.id}`}
        />
      ) : null}
    </XStack>
  );
}

/** Memoised: a long result list re-renders only the rows whose data changed. */
export const LeadSearchRow = memo(LeadSearchRowImpl);
