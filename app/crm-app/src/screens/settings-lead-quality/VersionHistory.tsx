import { useMemo } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack, useTheme } from 'tamagui';
import { CRM_QUALITY_CONFIG_STATUS_KEY, CRM_QUALITY_CONFIG_STATUS_TONE } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { SURFACE } from '@/components/surface';
import { ToneChip } from '@/components/ToneChip';
import { displayDateTime } from '@/features/reminders/reminderTime';
import type { CrmAppLeadQualityVersionsDocument } from '@/graphql/leadQualitySettings';
import { useTranslation } from '@/hooks/useTranslation';
import { HistorySection } from './HistorySection';

type Version = ResultOf<typeof CrmAppLeadQualityVersionsDocument>['crmLeadQualityVersions'][number];

interface Props {
  versions: readonly Version[];
  loading: boolean;
  error: string | null;
  busy: boolean;
  onRestore: (version: number) => void;
}

const searchOf = (row: Version) =>
  `${row.version} ${row.status} ${row.published_by?.name ?? ''} ${row.change_note}`;

/** Every version of the lead type's scoring model, newest first; any of them can become the draft again. */
export function VersionHistory({ versions, loading, error, busy, onRestore }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const rows = useMemo(() => versions.slice().sort((a, b) => b.version - a.version), [versions]);
  const dash = t('crmApp.common.dash');
  const field = (key: string, value: string | number) =>
    t('shell.a11y.fieldOf', { vars: { field: t(key), name: value } });
  const renderRow = (row: Version) => (
    <YStack key={row.id} {...SURFACE} gap="$1" testID={`lead-quality-version-${row.version}`}>
      <XStack alignItems="center" gap="$2" flexWrap="wrap">
        <Text flex={1} fontWeight="700">
          {field('crm.leadQualitySettings.colVersion', row.version)}
        </Text>
        <ToneChip
          label={t(CRM_QUALITY_CONFIG_STATUS_KEY[row.status])}
          tone={CRM_QUALITY_CONFIG_STATUS_TONE[row.status]}
        />
      </XStack>
      <Text color="$muted" fontSize="$2">
        {field(
          'crm.leadQualitySettings.colTotal',
          t('crm.leadQualitySettings.percent', { vars: { total: row.weightage_total } }),
        )}
      </Text>
      <Text color="$muted" fontSize="$2">
        {field('crm.leadQualitySettings.colPublishedBy', row.published_by?.name || dash)}
      </Text>
      <Text color="$muted" fontSize="$2">
        {field('crm.leadQualitySettings.colPublishedAt', displayDateTime(row.published_at) || dash)}
      </Text>
      <Text color="$muted" fontSize="$2">
        {field('crm.leadQualitySettings.colNote', row.change_note || dash)}
      </Text>
      <XStack marginTop="$1">
        <DuncitButton
          label={t('crm.leadQualitySettings.restore')}
          accessibilityLabel={`${t('crm.leadQualitySettings.restore')}, ${field('crm.leadQualitySettings.colVersion', row.version)}`}
          onPress={() => onRestore(row.version)}
          disabled={busy || row.status === 'DRAFT'}
          variant="outline"
          size="sm"
          icon={<MaterialIcons name="restore" size={18} color={theme.accentText?.val} />}
          testID={`lead-quality-restore-${row.version}`}
        />
      </XStack>
    </YStack>
  );
  return (
    <HistorySection
      title={t('crm.leadQualitySettings.versionsTitle')}
      searchLabel={t('crm.leadQualitySettings.versionsSearch')}
      emptyLabel={t('crm.leadQualitySettings.versionsEmpty')}
      rows={rows}
      loading={loading}
      error={error}
      searchOf={searchOf}
      renderRow={renderRow}
      testID="lead-quality-versions"
    />
  );
}
