import { useCallback, useEffect } from 'react';
import { FlatList } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, type NavigationProp } from '@react-navigation/native';
import { Input, Text, YStack, useTheme } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DuncitButton } from '@/components/DuncitButton';
import { StateView } from '@/components/StateView';
import { toEditableService } from '@/features/services-offered/serviceOffered';
import { useServicesOffered } from '@/features/services-offered/useServicesOffered';
import { useTranslation } from '@/hooks/useTranslation';
import type { AppStackParamList } from '@/navigation/types';
import { ServiceOfferedCard } from './ServiceOfferedCard';
import { ServiceSortBar } from './ServiceSortBar';

const SCOPE = 'crm-app/ServicesOfferedScreen';

/**
 * CRM › Data › Services Offered — the portal page on a phone: service titles
 * filed under Super → Category → Sub, searched and sorted on the server, read
 * page by page; add (several titles at once), edit, and delete after a confirm.
 */
export function ServicesOfferedScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const list = useServicesOffered({
    loadFailed: t('crmApp.common.loadFailed'),
    saveFailed: t('crmApp.common.saveFailed'),
  });
  const { refresh, removing } = list;

  useEffect(() => {
    navigation.setOptions({ title: t('shell.nav.servicesOffered') });
  }, [navigation, t]);
  // Back from add or edit: show what was saved.
  useFocusEffect(
    useCallback(() => fireAndForget(refresh(), logs.mobileApp, SCOPE, 'focus'), [refresh]),
  );

  return (
    <YStack flex={1} backgroundColor="$background">
      <FlatList
        data={list.rows}
        testID="services-list"
        keyExtractor={(row) => row.id}
        onEndReached={list.loadMore}
        onEndReachedThreshold={0.4}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <YStack gap="$3" marginBottom="$2">
            <Text color="$muted">{t('crm.data.servicesOfferedIntro')}</Text>
            <Input
              value={list.search}
              onChangeText={list.setSearch}
              placeholder={t('crm.data.searchServices')}
              aria-label={t('crm.data.searchServices')}
              placeholderTextColor="$muted"
              borderColor="$inputBorder"
              testID="services-search"
            />
            <ServiceSortBar sort={list.sort} onChange={list.setSort} />
            <DuncitButton
              label={t('crm.data.addServiceOffered')}
              onPress={() => navigation.navigate('ServiceOfferedEditor', {})}
              icon={<MaterialIcons name="add" size={20} color={theme.onPrimary?.val} />}
              testID="services-add"
            />
          </YStack>
        }
        renderItem={({ item }) => (
          <ServiceOfferedCard
            row={item}
            onEdit={() =>
              navigation.navigate('ServiceOfferedEditor', { service: toEditableService(item) })
            }
            onDelete={() => list.askDelete(item)}
          />
        )}
        ListEmptyComponent={
          <StateView
            loading={list.loading}
            error={list.error}
            empty={
              list.search.trim()
                ? t('crm.data.noMatchesForYourSearch')
                : t('crm.data.noServicesYet')
            }
            onRetry={list.refresh}
          />
        }
        ListFooterComponent={
          list.rows.length > 0 && list.loading ? <StateView loading inline /> : null
        }
      />
      {removing ? (
        <ConfirmDialog
          open
          title={t('crm.common.deleteService')}
          message={t('crm.data.deleteServiceMessage', { vars: { title: removing.title } })}
          confirmLabel={t('shell.common.delete')}
          cancelLabel={t('shell.common.cancel')}
          danger
          busy={list.deleting}
          error={list.deleteError}
          onConfirm={() =>
            fireAndForget(list.confirmDelete(removing), logs.mobileApp, SCOPE, 'delete')
          }
          onCancel={() => list.askDelete(null)}
          testID="service-delete-dialog"
        />
      ) : null}
    </YStack>
  );
}
