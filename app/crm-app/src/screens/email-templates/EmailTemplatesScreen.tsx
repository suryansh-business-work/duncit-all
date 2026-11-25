import { useCallback, useEffect, useState } from 'react';
import { FlatList } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, type NavigationProp } from '@react-navigation/native';
import { Input, Text, XStack, YStack, useTheme } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DuncitButton } from '@/components/DuncitButton';
import { Notice } from '@/components/email-templates/Notice';
import { StateView } from '@/components/StateView';
import {
  CrmAppEmailTemplateDeleteDocument,
  CrmAppEmailTemplateListDocument,
} from '@/graphql/emailTemplates';
import { usePagedSearch } from '@/hooks/usePagedSearch';
import { useTranslation } from '@/hooks/useTranslation';
import { gqlRequest } from '@/services/graphql.client';
import { errorMessage } from '@/utils/errors';
import type { AppStackParamList } from '@/navigation/types';
import { TemplateRow, type TemplateRowData } from './TemplateRow';

const SCOPE = 'crm-app/EmailTemplatesScreen';

/** CRM › Email Templates: the CRM's MJML templates by name, searchable; open one to edit, or delete it. */
export function EmailTemplatesScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const [search, setSearch] = useState('');
  const [removing, setRemoving] = useState<TemplateRowData | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);
  const fetchPage = useCallback(
    async (page: number, pageSize: number) => {
      const { crmEmailTemplatesTable } = await gqlRequest(CrmAppEmailTemplateListDocument, {
        query: {
          search: search.trim() || null,
          page,
          page_size: pageSize,
          sort_by: 'name',
          sort_dir: 'asc',
        },
      });
      return { rows: crmEmailTemplatesTable.rows, total: crmEmailTemplatesTable.total };
    },
    [search],
  );
  const list = usePagedSearch<TemplateRowData>(fetchPage, {
    fallbackError: t('crmApp.common.loadFailed'),
    scope: SCOPE,
  });
  const { refresh } = list;

  useEffect(() => {
    navigation.setOptions({ title: t('shell.nav.emailTemplates') });
  }, [navigation, t]);
  // Back from the editor or a new template: show what changed.
  useFocusEffect(
    useCallback(() => fireAndForget(refresh(), logs.mobileApp, SCOPE, 'focus'), [refresh]),
  );

  const confirmDelete = async (row: TemplateRowData) => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await gqlRequest(CrmAppEmailTemplateDeleteDocument, { id: row.template_id });
      setRemoving(null);
      setDeleted(true);
      await refresh();
    } catch (err) {
      setDeleteError(errorMessage(err, t('crmApp.common.saveFailed')));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <YStack flex={1} backgroundColor="$background">
      <FlatList
        data={list.rows}
        keyExtractor={(row) => row.template_id}
        onEndReached={list.loadMore}
        onEndReachedThreshold={0.4}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <YStack gap="$3" marginBottom="$2">
            <Text color="$muted">{t('crm.emailTemplates.listIntro')}</Text>
            {deleted ? (
              <Notice tone="success" onClose={() => setDeleted(false)} testID="templates-deleted">
                {t('crm.emailTemplates.templateDeleted')}
              </Notice>
            ) : null}
            <Input
              value={search}
              onChangeText={setSearch}
              placeholder={t('crm.emailTemplates.searchTemplates')}
              aria-label={t('crm.emailTemplates.searchTemplates')}
              placeholderTextColor="$muted"
              borderColor="$inputBorder"
              testID="templates-search"
            />
            <XStack gap="$2" flexWrap="wrap">
              <DuncitButton
                label={t('crm.emailTemplates.newTemplate')}
                onPress={() => navigation.navigate('EmailTemplateCreate')}
                icon={<MaterialIcons name="add" size={20} color={theme.onPrimary?.val} />}
                testID="templates-new"
              />
              <DuncitButton
                label={t('crm.emailTemplates.settings')}
                onPress={() => navigation.navigate('EmailTemplateSettings', undefined)}
                variant="outline"
                icon={<MaterialIcons name="settings" size={20} color={theme.accentText?.val} />}
                testID="templates-settings"
              />
            </XStack>
          </YStack>
        }
        renderItem={({ item }) => (
          <TemplateRow
            row={item}
            onOpen={() => navigation.navigate('EmailTemplateEditor', { id: item.template_id })}
            onDelete={() => {
              setDeleteError(null);
              setRemoving(item);
            }}
          />
        )}
        ListEmptyComponent={
          <StateView
            loading={list.loading}
            error={list.error}
            empty={t('crm.emailTemplates.noTemplatesYet')}
            onRetry={list.refresh}
          />
        }
        ListFooterComponent={list.rows.length > 0 && list.loading ? <StateView loading /> : null}
      />
      {removing ? (
        <ConfirmDialog
          open
          title={t('crm.emailTemplates.deleteTemplate')}
          message={t('crm.emailTemplates.deleteTemplateMessage', { vars: { name: removing.name } })}
          confirmLabel={t('shell.common.delete')}
          cancelLabel={t('shell.common.cancel')}
          danger
          busy={deleting}
          error={deleteError}
          onConfirm={() => fireAndForget(confirmDelete(removing), logs.mobileApp, SCOPE, 'delete')}
          onCancel={() => setRemoving(null)}
          testID="template-delete-dialog"
        />
      ) : null}
    </YStack>
  );
}
