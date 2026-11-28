import { memo } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack, useTheme } from 'tamagui';
import { formatDate } from '@duncit/datetime';
import {
  CRM_GEO_PRECISION_KEY,
  CRM_LEAD_PRIORITY_TONE,
  CRM_LEAD_STATUS_TONE,
  CRM_QUALIFICATION_KEY,
  crmFormatKm,
  crmToneOf,
  type CrmTone,
} from '@duncit/utils';

import { LeadAvatar } from '@/components/LeadAvatar';
import { IconButton } from '@/components/mobile/IconButton';
import { SURFACE } from '@/components/surface';
import { ToneChip } from '@/components/ToneChip';
import { MOBILE } from '@/constants/design';
import type { LeadListRow as Row } from '@/features/leads-list/listKinds';
import { useTranslation } from '@/hooks/useTranslation';
import { haptics } from '@/services/haptics';
import { LeadListRowMatched } from './LeadListRowMatched';

/** The score band's colour (success, warning or error), `default` for one this build does not know. */
const SCORE_TONES: ReadonlySet<string> = new Set(['success', 'warning', 'error', 'info']);
const isScoreTone = (tone: string): tone is CrmTone => SCORE_TONES.has(tone);
const scoreTone = (tone: string): CrmTone => (isScoreTone(tone) ? tone : 'default');

const day = (iso: string | null | undefined) => {
  if (!iso) return '';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : formatDate(date);
};

interface Props {
  row: Row;
  /** The kind matches Duncit accounts, so its card shows Devices and Last activity. */
  matchedUser: boolean;
  onOpen: (row: Row) => void;
  /** Rings the primary contact's mobile on the CRM call line. */
  onCall: (row: Row, number: string) => void;
  /** Opens the row's actions sheet (Edit, Delete…); a long press on the card does too. */
  onMore: (row: Row) => void;
}

/**
 * One lead on a kind's listing — the portal table's row as a mobile card:
 * who and how to reach them first, status and score next, the rest under it.
 * Call sits at the thumb's side; Edit and Delete live in the ⋯ sheet so a
 * stray tap cannot delete. A duplicate lead's card is red.
 */
function LeadListRowImpl({ row, matchedUser, onOpen, onCall, onMore }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const contact = row.contacts[0];
  const mobile = contact?.mobile_number ?? '';
  const precision = row.geo_precision ? CRM_GEO_PRECISION_KEY[row.geo_precision] : undefined;
  const duplicate = Boolean(row.is_duplicate);
  const details = [row.extra, row.city, contact?.email].filter(Boolean).join(' · ');
  const followUp = day(row.next_follow_up_date);
  const owner = [
    row.assigned_to ? `${t('crm.forms.assignedTo')}: ${row.assigned_to}` : '',
    followUp ? `${t('crm.leadList.followUp')}: ${followUp}` : '',
  ].filter(Boolean);
  const more = () => {
    haptics.heavy();
    onMore(row);
  };
  return (
    <YStack
      {...SURFACE}
      gap="$2"
      borderColor={duplicate ? '$danger' : SURFACE.borderColor}
      backgroundColor={duplicate ? '$dangerSoft' : SURFACE.backgroundColor}
      role="button"
      aria-label={row.name}
      onPress={() => onOpen(row)}
      onLongPress={more}
      pressStyle={{ backgroundColor: duplicate ? '$dangerSoft' : '$soft' }}
      testID={`lead-list-row-${row.id}`}
    >
      <XStack gap="$3" alignItems="center">
        <LeadAvatar name={row.name} size={MOBILE.avatar} />
        <YStack flex={1} gap="$0.5">
          <Text fontWeight="700" numberOfLines={1}>
            {row.name}
          </Text>
          <Text color="$muted" fontSize="$2">
            {mobile || t('crmApp.common.dash')}
          </Text>
        </YStack>
        {mobile ? (
          <IconButton
            icon={{ name: 'phone' }}
            variant="filled"
            label={t('crm.leadDetail.callNumber', { vars: { number: mobile } })}
            onPress={() => onCall(row, mobile)}
            testID={`lead-list-call-${row.id}`}
          />
        ) : null}
        <IconButton
          icon={{ name: 'more-vert' }}
          label={t('crmApp.mobile.moreActionsFor', { vars: { name: row.name } })}
          onPress={() => onMore(row)}
          testID={`lead-list-more-${row.id}`}
        />
      </XStack>
      {duplicate ? (
        <XStack
          aria-label={`${t('crm.duplicates.rowLabel')}: ${t('crm.duplicates.rowHint')}`}
          alignItems="center"
          gap="$1"
        >
          <MaterialIcons name="content-copy" size={14} color={theme.danger?.val} />
          <ToneChip
            label={t('crm.duplicates.rowLabel')}
            tone="error"
            testID="lead-duplicate-chip"
          />
        </XStack>
      ) : null}
      {typeof row.distance_km === 'number' ? (
        <Text fontSize="$2" fontWeight="600" testID={`lead-list-distance-${row.id}`}>
          {[
            t('crm.nearby.distanceValue', { vars: { km: crmFormatKm(row.distance_km) } }),
            precision ? t(precision.short) : '',
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      ) : null}
      <XStack flexWrap="wrap" gap="$1.5">
        <ToneChip label={row.lead_status} tone={crmToneOf(CRM_LEAD_STATUS_TONE, row.lead_status)} />
        <ToneChip label={row.priority} tone={crmToneOf(CRM_LEAD_PRIORITY_TONE, row.priority)} />
        {row.quality ? (
          <ToneChip
            label={`${Math.round(row.quality.score)} · ${row.quality.classification_label}`}
            tone={scoreTone(row.quality.tone)}
            testID={`lead-list-score-${row.id}`}
          />
        ) : (
          <ToneChip label={t('crm.leadQuality.notScored')} tone="default" />
        )}
        {row.quality ? (
          <ToneChip
            label={t(
              CRM_QUALIFICATION_KEY[row.quality.qualification] ??
                'crm.leadQuality.pendingVerification',
            )}
            tone="default"
          />
        ) : null}
      </XStack>
      {details ? (
        <Text color="$muted" fontSize="$2" numberOfLines={2}>
          {details}
        </Text>
      ) : null}
      {owner.length > 0 ? (
        <Text color="$muted" fontSize="$2">
          {owner.join(' · ')}
        </Text>
      ) : null}
      {matchedUser ? <LeadListRowMatched matched={row.matched_user ?? null} /> : null}
    </YStack>
  );
}

/** Memoised: paging in more leads re-renders only the new cards. */
export const LeadListRow = memo(LeadListRowImpl);
