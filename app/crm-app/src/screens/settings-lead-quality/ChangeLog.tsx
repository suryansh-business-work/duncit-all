import { useMemo } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { Text, XStack, YStack } from 'tamagui';
import { CRM_QUALITY_CHANGE_KIND_KEY, crmKeyOr } from '@duncit/utils';

import { SURFACE } from '@/components/surface';
import { displayDateTime } from '@/features/reminders/reminderTime';
import type { CrmAppLeadQualitySettingsHistoryDocument } from '@/graphql/leadQualitySettings';
import { useTranslation } from '@/hooks/useTranslation';
import { HistorySection } from './HistorySection';

type Change = ResultOf<
  typeof CrmAppLeadQualitySettingsHistoryDocument
>['crmLeadQualitySettingsHistory'][number];

interface Props {
  changes: readonly Change[];
  loading: boolean;
  error: string | null;
}

const searchOf = (row: Change) =>
  `${row.kind} ${row.config_version ?? ''} ${row.actor.name} ${row.note}`;

/** Drafts saved, versions published and drafts discarded for the lead type, newest first. */
export function ChangeLog({ changes, loading, error }: Readonly<Props>) {
  const { t } = useTranslation();
  const rows = useMemo(
    () => changes.slice().sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [changes],
  );
  const dash = t('crmApp.common.dash');
  const field = (key: string, value: string | number) =>
    t('shell.a11y.fieldOf', { vars: { field: t(key), name: value } });
  const renderRow = (row: Change) => (
    <YStack key={row.id} {...SURFACE} gap="$1" testID={`lead-quality-change-${row.id}`}>
      <XStack alignItems="center" gap="$2" flexWrap="wrap">
        <Text flex={1} fontWeight="700">
          {t(crmKeyOr(CRM_QUALITY_CHANGE_KIND_KEY, row.kind, 'crm.leadQualitySettings.kindOther'))}
        </Text>
        <Text color="$muted" fontSize="$2">
          {displayDateTime(row.created_at) || dash}
        </Text>
      </XStack>
      <Text color="$muted" fontSize="$2">
        {field('crm.leadQualitySettings.colVersion', row.config_version ?? dash)}
      </Text>
      <Text color="$muted" fontSize="$2">
        {field('crm.leadQualitySettings.colBy', row.actor.name || dash)}
      </Text>
      <Text color="$muted" fontSize="$2">
        {field('crm.leadQualitySettings.colNote', row.note || dash)}
      </Text>
    </YStack>
  );
  return (
    <HistorySection
      title={t('crm.leadQualitySettings.changesTitle')}
      searchLabel={t('crm.leadQualitySettings.changesSearch')}
      emptyLabel={t('crm.leadQualitySettings.changesEmpty')}
      rows={rows}
      loading={loading}
      error={error}
      searchOf={searchOf}
      renderRow={renderRow}
      testID="lead-quality-change-log"
    />
  );
}
