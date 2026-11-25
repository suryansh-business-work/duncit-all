import { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import {
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import { YStack } from 'tamagui';
import { crmPickServiceTargets } from '@duncit/utils';

import {
  AddServiceOfferedForm,
  EditServiceOfferedForm,
  toCreateServicesInput,
  toUpdateServiceInput,
} from '@/forms/service-offered';
import {
  CrmAppCreateServicesOfferedDocument,
  CrmAppUpdateServiceOfferedDocument,
} from '@/graphql/servicesOffered';
import { useTranslation } from '@/hooks/useTranslation';
import type { AppStackParamList } from '@/navigation/types';
import { AuthAlert } from '@/screens/auth/AuthAlert';
import { gqlRequest } from '@/services/graphql.client';
import { errorMessage } from '@/utils/errors';

/**
 * Add Service Offered (no service handed over) or edit one — the portal's two
 * dialogs as a screen. A save goes back to the list; a refusal (a title already
 * in that category, say) stays on screen above the form.
 */
export function ServiceOfferedEditorScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const { params } = useRoute<RouteProp<AppStackParamList, 'ServiceOfferedEditor'>>();
  const service = params.service ?? null;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    navigation.setOptions({
      title: service ? t('crm.data.editServiceOffered') : t('crm.data.addServiceOffered'),
    });
  }, [navigation, service, t]);

  const save = async (request: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await request();
      navigation.goBack();
    } catch (err) {
      setError(errorMessage(err, t('crmApp.common.saveFailed')));
    } finally {
      setBusy(false);
    }
  };

  return (
    <YStack flex={1} backgroundColor="$background">
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12 }}
        keyboardShouldPersistTaps="handled"
      >
        {error ? <AuthAlert message={error} testID="service-error" /> : null}
        {service ? (
          <EditServiceOfferedForm
            values={{
              title: service.title,
              is_active: service.is_active,
              ...crmPickServiceTargets(service),
            }}
            busy={busy}
            onSubmit={(values) =>
              save(() =>
                gqlRequest(CrmAppUpdateServiceOfferedDocument, {
                  id: service.id,
                  input: toUpdateServiceInput(values),
                }),
              )
            }
            onCancel={() => navigation.goBack()}
          />
        ) : (
          <AddServiceOfferedForm
            busy={busy}
            onSubmit={(values) =>
              save(() =>
                gqlRequest(CrmAppCreateServicesOfferedDocument, {
                  input: toCreateServicesInput(values),
                }),
              )
            }
            onCancel={() => navigation.goBack()}
          />
        )}
      </ScrollView>
    </YStack>
  );
}
