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

import { DuncitButton } from '@/components/DuncitButton';
import { SURFACE } from '@/components/surface';
import { ToneChip } from '@/components/ToneChip';
import type { LeadListRow as Row } from '@/features/leads-list/listKinds';
import { useTranslation } from '@/hooks/useTranslation';
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
  onEdit: (row: Row) => void;
  onDelete: (row: Row) => void;
}

/** One lead on a listing — the portal table's row as a card; a duplicate lead's card is red. */
export function LeadListRow({ row, matchedUser, onOpen, onEdit, onDelete }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const contact = row.contacts[0];
  const precision = row.geo_precision ? CRM_GEO_PRECISION_KEY[row.geo_precision] : undefined;
  const duplicate = Boolean(row.is_duplicate);
  const details = [row.extra, row.city, contact?.email].filter(Boolean).join(' · ');
  const followUp = day(row.next_follow_up_date);
  const owner = [
    row.assigned_to ? `${t('crm.forms.assignedTo')}: ${row.assigned_to}` : '',
    followUp ? `${t('crm.leadList.followUp')}: ${followUp}` : '',
  ].filter(Boolean);
  return (
    <YStack
      {...SURFACE}
      gap="$2"
      borderColor={duplicate ? '$danger' : SURFACE.borderColor}
      backgroundColor={duplicate ? '$dangerSoft' : SURFACE.backgroundColor}
      testID={`lead-list-row-${row.id}`}
    >
      <XStack
        role="button"
        aria-label={row.name}
        onPress={() => onOpen(row)}
        gap="$2"
        alignItems="flex-start"
      >
        <YStack flex={1} gap="$1">
          <Text fontWeight="700" numberOfLines={1}>
            {row.name}
          </Text>
          <Text color="$muted" fontSize="$2">
            {contact?.mobile_number || t('crmApp.common.dash')}
          </Text>
        </YStack>
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
      </XStack>
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
      <XStack flexWrap="wrap" gap="$2">
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
      <XStack justifyContent="flex-end" gap="$2">
        <DuncitButton
          label={t('shell.common.edit')}
          accessibilityLabel={`${t('shell.common.edit')} ${row.name}`}
          onPress={() => onEdit(row)}
          variant="ghost"
          size="sm"
          testID={`lead-list-edit-${row.id}`}
        />
        <DuncitButton
          label={t('shell.common.delete')}
          accessibilityLabel={`${t('shell.common.delete')} ${row.name}`}
          onPress={() => onDelete(row)}
          variant="ghost"
          tone="danger"
          size="sm"
          testID={`lead-list-delete-${row.id}`}
        />
      </XStack>
    </YStack>
  );
}
