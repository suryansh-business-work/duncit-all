import { useCallback, useLayoutEffect, useState } from 'react';
import { Linking, ScrollView } from 'react-native';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import { Text, XStack, YStack } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';

import { Card } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DuncitButton } from '@/components/DuncitButton';
import { StateView } from '@/components/StateView';
import { RADII } from '@/constants/design';
import { displayDateTime } from '@/features/reminders/reminderTime';
import { CrmAppDeleteUserLeadDocument, CrmAppUserLeadDocument } from '@/graphql/userLeads';
import { useGqlQuery } from '@/hooks/useGqlQuery';
import { useTranslation } from '@/hooks/useTranslation';
import type { AppStackParamList } from '@/navigation/types';
import { dialNumber, whatsappUrl } from '@/services/dialer';
import { gqlRequest } from '@/services/graphql.client';
import { errorMessage } from '@/utils/errors';

const SCOPE = 'crm-app/UserLeadDetail';

function Fact({ label, value }: Readonly<{ label: string; value?: string | null }>) {
  const { t } = useTranslation();
  return (
    <XStack justifyContent="space-between" gap="$3" paddingVertical="$1">
      <Text color="$muted">{label}</Text>
      <Text fontWeight="600" flexShrink={1} textAlign="right">
        {value || t('crmApp.common.dash')}
      </Text>
    </XStack>
  );
}

function Chips({
  title,
  items,
}: Readonly<{ title: string; items: readonly { jid: string; name?: string | null }[] }>) {
  const { t } = useTranslation();
  return (
    <Card title={title}>
      {items.length === 0 ? <Text color="$muted">{t('crmApp.userLeads.none')}</Text> : null}
      <XStack flexWrap="wrap" gap="$2">
        {items.map((item) => (
          <YStack
            key={item.jid}
            borderWidth={1}
            borderColor="$borderColor"
            borderRadius={RADII.pill}
            paddingHorizontal="$3"
            paddingVertical="$1"
          >
            <Text fontSize="$2">{item.name || item.jid}</Text>
          </YStack>
        ))}
      </XStack>
    </Card>
  );
}

/** One WhatsApp user lead: where it was found, call or WhatsApp it, edit or delete it — the portal's lead page. */
export function UserLeadDetailScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const { params } = useRoute<RouteProp<AppStackParamList, 'UserLeadDetail'>>();
  const { data, loading, error, refetch } = useGqlQuery(
    CrmAppUserLeadDocument,
    { id: params.id },
    { fallbackError: t('crmApp.common.loadFailed') },
  );
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const lead = data?.waUserLead ?? null;

  useFocusEffect(
    useCallback(() => fireAndForget(refetch(), logs.mobileApp, SCOPE, 'refetch'), [refetch]),
  );
  useLayoutEffect(() => {
    navigation.setOptions({ title: t('crm.userLeads.whatsappLead') });
  }, [navigation, t]);

  if (!lead) {
    const notFound = !loading && !error && data ? t('crmApp.userLeads.notFound') : null;
    return <StateView loading={loading && !data} error={error ?? notFound} onRetry={refetch} />;
  }

  const remove = async () => {
    setBusy(true);
    setDeleteError(null);
    try {
      await gqlRequest(CrmAppDeleteUserLeadDocument, { id: lead.id });
      setConfirm(false);
      navigation.goBack();
    } catch (err) {
      setDeleteError(errorMessage(err, t('crmApp.common.saveFailed')));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <YStack>
        <Text fontSize="$8" fontWeight="800" role="heading">
          {lead.name || lead.phone}
        </Text>
        <Text color="$muted">{lead.phone}</Text>
      </YStack>
      <XStack gap="$2" flexWrap="wrap">
        <DuncitButton
          label={t('crmApp.userLeads.call')}
          onPress={() => fireAndForget(dialNumber(lead.phone), logs.mobileApp, SCOPE, 'call')}
          size="sm"
          testID="user-lead-call"
        />
        <DuncitButton
          label={t('crmApp.userLeads.whatsapp')}
          onPress={() =>
            fireAndForget(
              Linking.openURL(whatsappUrl(lead.phone)),
              logs.mobileApp,
              SCOPE,
              'whatsapp',
            )
          }
          variant="outline"
          size="sm"
          testID="user-lead-whatsapp"
        />
        <DuncitButton
          label={t('crmApp.editor.edit')}
          onPress={() => navigation.navigate('UserLeadEditor', { id: lead.id })}
          variant="outline"
          size="sm"
          testID="user-lead-edit"
        />
        <DuncitButton
          label={t('crmApp.userLeads.delete')}
          onPress={() => setConfirm(true)}
          variant="ghost"
          tone="danger"
          size="sm"
          testID="user-lead-delete"
        />
      </XStack>
      <Card>
        <Fact
          label={t('crm.userLeads.sourceWhatsappAccount')}
          value={lead.source_account ? `+${lead.source_account}` : null}
        />
        <Fact
          label={t('crm.userLeads.imported')}
          value={lead.imported_at ? displayDateTime(lead.imported_at) : null}
        />
        <Fact label={t('crm.userLeads.contactJid')} value={lead.contact_jid} />
      </Card>
      <Chips title={t('crmApp.userLeads.communities')} items={lead.source_communities} />
      <Chips title={t('crmApp.userLeads.groups')} items={lead.source_groups} />
      <ConfirmDialog
        open={confirm}
        title={t('crmApp.userLeads.deleteTitle')}
        message={t('crmApp.userLeads.deleteMessage', { vars: { name: lead.name || lead.phone } })}
        confirmLabel={t('crmApp.userLeads.delete')}
        cancelLabel={t('shell.common.cancel')}
        danger
        busy={busy}
        error={deleteError}
        onConfirm={() => fireAndForget(remove(), logs.mobileApp, SCOPE, 'delete')}
        onCancel={() => setConfirm(false)}
        testID="user-lead-delete-dialog"
      />
    </ScrollView>
  );
}
