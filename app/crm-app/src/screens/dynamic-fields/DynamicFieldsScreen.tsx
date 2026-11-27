import { useCallback, useEffect, useState } from 'react';
import { FlatList } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, type NavigationProp } from '@react-navigation/native';
import { YStack, useTheme } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DuncitButton } from '@/components/DuncitButton';
import { StateView } from '@/components/StateView';
import {
  useDynamicFields,
  type DynamicFieldRecord,
} from '@/features/dynamic-fields/useDynamicFields';
import { useTranslation } from '@/hooks/useTranslation';
import type { AppStackParamList } from '@/navigation/types';
import { AuthAlert } from '@/screens/auth/AuthAlert';
import { DynamicFieldRow } from './DynamicFieldRow';

const SCOPE = 'crm-app/DynamicFieldsScreen';

/**
 * CRM › Settings › Dynamic Fields — the custom fields shown on lead forms, in
 * the order the forms show them: add one, edit or delete it, switch it on or
 * off, and move it up or down (the order is saved at once).
 */
export function DynamicFieldsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const fields = useDynamicFields();
  const [removing, setRemoving] = useState<DynamicFieldRecord | null>(null);

  useEffect(() => {
    navigation.setOptions({ title: t('shell.nav.dynamicFields') });
  }, [navigation, t]);
  // Back from the editor: show what was saved.
  const { refetch } = fields;
  useFocusEffect(
    useCallback(() => fireAndForget(refetch(), logs.mobileApp, SCOPE, 'focus'), [refetch]),
  );

  const confirmDelete = async () => {
    if (!removing) return;
    await fields.remove(removing);
    setRemoving(null);
  };

  return (
    <YStack flex={1} backgroundColor="$background">
      <FlatList
        data={fields.rows}
        keyExtractor={(row) => row.id}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        ListHeaderComponent={
          <YStack gap="$3" marginBottom="$2">
            <DuncitButton
              label={t('crm.managedynamicfieldspage.newField')}
              onPress={() => navigation.navigate('DynamicFieldEditor', {})}
              disabled={fields.busy}
              icon={<MaterialIcons name="add" size={20} color={theme.onPrimary?.val} />}
              testID="dynamic-fields-add"
            />
            {fields.error ? (
              <AuthAlert message={fields.error} testID="dynamic-fields-error" />
            ) : null}
          </YStack>
        }
        renderItem={({ item, index }) => (
          <DynamicFieldRow
            row={item}
            index={index}
            count={fields.rows.length}
            busy={fields.busy}
            onMove={(from, to) =>
              fireAndForget(fields.move(from, to), logs.mobileApp, SCOPE, 'move')
            }
            onToggle={() => fireAndForget(fields.toggle(item), logs.mobileApp, SCOPE, 'toggle')}
            onEdit={() => navigation.navigate('DynamicFieldEditor', { id: item.id })}
            onDelete={() => setRemoving(item)}
          />
        )}
        ListEmptyComponent={
          <StateView
            loading={fields.loading}
            error={fields.loadError}
            empty={t('crm.managedynamicfieldspage.empty')}
            onRetry={fields.refetch}
          />
        }
      />
      <ConfirmDialog
        open={removing !== null}
        title={t('crm.managedynamicfieldspage.deleteDynamicField')}
        message={t('crm.managedynamicfieldspage.deleteMessage', {
          vars: { name: removing?.label ?? '' },
        })}
        confirmLabel={t('shell.common.delete')}
        cancelLabel={t('shell.common.cancel')}
        danger
        busy={fields.busy}
        onConfirm={() => fireAndForget(confirmDelete(), logs.mobileApp, SCOPE, 'delete')}
        onCancel={() => setRemoving(null)}
        testID="dynamic-field-delete-dialog"
      />
    </YStack>
  );
}
