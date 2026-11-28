import { useCallback, useEffect, useState } from 'react';
import { FlatList } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, type NavigationProp } from '@react-navigation/native';
import { Input, Text, XStack, YStack, useTheme } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';

import { DuncitButton } from '@/components/DuncitButton';
import { StateView } from '@/components/StateView';
import { SURFACE } from '@/components/surface';
import { ToneChip } from '@/components/ToneChip';
import { CALL_PROMPT_LANGUAGES } from '@/forms/call-prompt';
import { CrmAppCallPromptsDocument } from '@/graphql/callPrompts';
import { usePagedSearch } from '@/hooks/usePagedSearch';
import { useTranslation } from '@/hooks/useTranslation';
import type { AppStackParamList } from '@/navigation/types';
import { gqlRequest } from '@/services/graphql.client';

type Row = {
  id: string;
  name: string;
  description?: string | null;
  language: string;
  is_active: boolean;
};

/** CRM › AI Call Prompts › Static Content: every prompt, newest first, searchable; tap one to edit it. */
export function CallPromptsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const [search, setSearch] = useState('');
  const fetchPage = useCallback(
    async (page: number, pageSize: number) => {
      const { crmCallPromptsTable } = await gqlRequest(CrmAppCallPromptsDocument, {
        query: {
          search: search.trim() || null,
          page,
          page_size: pageSize,
          sort_by: 'updated_at',
          sort_dir: 'desc',
        },
      });
      return { rows: crmCallPromptsTable.rows, total: crmCallPromptsTable.total };
    },
    [search],
  );
  const prompts = usePagedSearch<Row>(fetchPage, {
    fallbackError: t('crmApp.common.loadFailed'),
    scope: 'crm-app/CallPromptsScreen',
  });
  const languageLabel = (value: string) => {
    const known = CALL_PROMPT_LANGUAGES.find((l) => l.value === value);
    return known ? t(known.labelKey) : value;
  };

  useEffect(() => {
    navigation.setOptions({ title: t('shell.nav.staticContent') });
  }, [navigation, t]);
  // Back from the editor: show what was saved or deleted.
  const { refresh } = prompts;
  useFocusEffect(
    useCallback(
      () => fireAndForget(refresh(), logs.mobileApp, 'crm-app/CallPromptsScreen', 'focus'),
      [refresh],
    ),
  );

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: theme.background?.val }}
      data={prompts.rows}
      keyExtractor={(row) => row.id}
      onEndReached={prompts.loadMore}
      onEndReachedThreshold={0.4}
      contentContainerStyle={{ padding: 16, gap: 8 }}
      ListHeaderComponent={
        <YStack gap="$3" marginBottom="$2">
          <Input
            value={search}
            onChangeText={setSearch}
            placeholder={t('crm.callPrompts.search')}
            aria-label={t('crm.callPrompts.search')}
            placeholderTextColor="$muted"
            borderColor="$inputBorder"
            testID="prompts-search"
          />
          <DuncitButton
            label={t('crm.callPrompts.add')}
            onPress={() => navigation.navigate('CallPromptEditor', {})}
            icon={<MaterialIcons name="add" size={20} color={theme.onPrimary?.val} />}
            testID="prompts-add"
          />
        </YStack>
      }
      renderItem={({ item }) => (
        <YStack
          {...SURFACE}
          role="button"
          aria-label={t('crm.common.editNamed', { vars: { name: item.name } })}
          onPress={() => navigation.navigate('CallPromptEditor', { id: item.id })}
          pressStyle={{ backgroundColor: '$soft' }}
          gap="$1"
          testID={`prompt-row-${item.id}`}
        >
          <XStack alignItems="center" gap="$2">
            <Text flex={1} fontWeight="700" numberOfLines={1}>
              {item.name}
            </Text>
            <ToneChip
              label={item.is_active ? t('crm.common.active') : t('crm.common.inactive')}
              tone={item.is_active ? 'success' : 'default'}
            />
          </XStack>
          <Text color="$muted" fontSize="$2" numberOfLines={2}>
            {[languageLabel(item.language), item.description].filter(Boolean).join(' · ')}
          </Text>
        </YStack>
      )}
      ListEmptyComponent={
        <StateView
          loading={prompts.loading}
          error={prompts.error}
          empty={t('crm.callPrompts.empty')}
          onRetry={prompts.refresh}
        />
      }
      ListFooterComponent={
        prompts.rows.length > 0 && prompts.loading ? <StateView loading inline /> : null
      }
    />
  );
}
