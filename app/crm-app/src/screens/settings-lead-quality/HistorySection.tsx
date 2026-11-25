import { useMemo, useState, type ReactNode } from 'react';
import { Input, Text, YStack } from 'tamagui';

import { StateView } from '@/components/StateView';
import { useTranslation } from '@/hooks/useTranslation';
import { AuthAlert } from '@/screens/auth/AuthAlert';

interface Props<R> {
  title: string;
  searchLabel: string;
  emptyLabel: string;
  rows: readonly R[];
  loading: boolean;
  error: string | null;
  /** The text a row is found by. */
  searchOf: (row: R) => string;
  renderRow: (row: R) => ReactNode;
  testID: string;
}

/** A searchable list section of the settings page (the portal's version history and change log tables). */
export function HistorySection<R>({
  title,
  searchLabel,
  emptyLabel,
  rows,
  loading,
  error,
  searchOf,
  renderRow,
  testID,
}: Readonly<Props<R>>) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const shown = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return needle ? rows.filter((row) => searchOf(row).toLowerCase().includes(needle)) : rows;
  }, [rows, search, searchOf]);
  return (
    <YStack gap="$2" testID={testID}>
      <Text fontWeight="700" fontSize="$5" role="heading">
        {title}
      </Text>
      {error ? <AuthAlert message={error} testID={`${testID}-error`} /> : null}
      <Input
        value={search}
        onChangeText={setSearch}
        placeholder={searchLabel}
        aria-label={searchLabel}
        placeholderTextColor="$muted"
        borderColor="$inputBorder"
        testID={`${testID}-search`}
      />
      {shown.map(renderRow)}
      {shown.length === 0 ? (
        <StateView empty={loading ? t('crm.leadQualitySettings.loading') : emptyLabel} />
      ) : null}
    </YStack>
  );
}
