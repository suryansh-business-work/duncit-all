import { useEffect, useState } from 'react';
import { FlatList } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import {
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import { Input, Text, YStack, useTheme } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DuncitButton } from '@/components/DuncitButton';
import { StateView } from '@/components/StateView';
import {
  MANAGED_GROUP_COPY,
  useManagedOptions,
  type ManagedOption,
} from '@/features/data/useManagedOptions';
import { ManagedOptionForm } from '@/forms/managed-option';
import { useTranslation } from '@/hooks/useTranslation';
import type { AppStackParamList } from '@/navigation/types';
import { AuthAlert } from '@/screens/auth/AuthAlert';
import { ManagedOptionRow } from './ManagedOptionRow';

const SCOPE = 'crm-app/ManagedOptionsScreen';

/**
 * CRM › Data › Venues › Amenities / Event Suitability — the portal's managed
 * list on a phone: search, add, edit in place, switch on/off and delete. Lead
 * forms offer only the active entries.
 */
export function ManagedOptionsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const { params } = useRoute<RouteProp<AppStackParamList, 'ManagedOptions'>>();
  const copy = MANAGED_GROUP_COPY[params.group];
  const list = useManagedOptions(params.group, t('crmApp.common.saveFailed'));
  const [removing, setRemoving] = useState<ManagedOption | null>(null);

  useEffect(() => {
    navigation.setOptions({ title: t(copy.title) });
  }, [navigation, copy.title, t]);

  const form = (id: string | null) =>
    list.draft && list.draft.id === id ? (
      <ManagedOptionForm
        values={list.draft.values}
        placeholder={t(copy.placeholder)}
        busy={list.busy}
        onSubmit={list.save}
        onCancel={() => list.setDraft(null)}
        testID={id ? `option-form-${id}` : 'option-form-new'}
      />
    ) : null;

  const confirmDelete = async () => {
    if (!removing) return;
    await list.remove(removing);
    setRemoving(null);
  };

  return (
    <YStack flex={1} backgroundColor="$background">
      <FlatList
        data={list.visible}
        keyExtractor={(row) => row.id}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <YStack gap="$3" marginBottom="$2">
            <Text color="$muted">{t(copy.intro)}</Text>
            <Input
              value={list.search}
              onChangeText={list.setSearch}
              placeholder={t(copy.search)}
              aria-label={t(copy.search)}
              placeholderTextColor="$muted"
              borderColor="$inputBorder"
              testID="options-search"
            />
            <DuncitButton
              label={t(copy.add)}
              onPress={list.startCreate}
              disabled={list.busy || list.draft !== null}
              variant="outline"
              icon={<MaterialIcons name="add" size={20} color={theme.accentText?.val} />}
              testID="options-add"
            />
            {list.error ? <AuthAlert message={list.error} testID="options-error" /> : null}
            {form(null)}
          </YStack>
        }
        renderItem={({ item }) =>
          form(item.id) ?? (
            <ManagedOptionRow
              row={item}
              busy={list.busy}
              locked={list.busy || list.draft !== null}
              onToggle={() => fireAndForget(list.toggle(item), logs.mobileApp, SCOPE, 'toggle')}
              onEdit={() => list.startEdit(item)}
              onDelete={() => setRemoving(item)}
            />
          )
        }
        ListEmptyComponent={
          <StateView
            loading={list.loading}
            error={list.loadError}
            empty={
              list.rows.length === 0
                ? t('crm.data.optionsEmpty', { vars: { label: t(copy.add) } })
                : t('crm.data.noMatchesForYourSearch')
            }
            onRetry={list.refetch}
          />
        }
      />
      <ConfirmDialog
        open={removing !== null}
        title={t('crm.data.deleteOptionTitle', { vars: { name: removing?.name ?? '' } })}
        message={t('crm.data.existingLeadsKeepTheirEntriesOnly')}
        confirmLabel={t('shell.common.delete')}
        cancelLabel={t('shell.common.cancel')}
        danger
        busy={list.busy}
        onConfirm={() => fireAndForget(confirmDelete(), logs.mobileApp, SCOPE, 'delete')}
        onCancel={() => setRemoving(null)}
        testID="option-delete-dialog"
      />
    </YStack>
  );
}
