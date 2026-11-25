import { FlatList, Modal } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack, useTheme } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { StateView } from '@/components/StateView';
import { SURFACE } from '@/components/surface';
import { waDisplayName, waNumberLine } from '@/features/whatsapp-generator/format';
import type { WaGroupRef } from '@/features/whatsapp-generator/useWaBrowser';
import { CrmAppWhatsappGroupMembersDocument } from '@/graphql/whatsappGenerator';
import { useGqlQuery } from '@/hooks/useGqlQuery';
import { useTranslation } from '@/hooks/useTranslation';
import type { AppStackParamList } from '@/navigation/types';

/** The members of one group, read live from WhatsApp (the server also saves them as leads). */
function MembersList({ group }: Readonly<{ group: WaGroupRef }>) {
  const { t } = useTranslation();
  const members = useGqlQuery(
    CrmAppWhatsappGroupMembersDocument,
    { group_jid: group.jid },
    { fallbackError: t('crmApp.common.loadFailed') },
  );
  const rows = members.data?.waGroupMembers ?? [];
  return (
    <FlatList
      data={rows}
      keyExtractor={(m) => m.jid}
      contentContainerStyle={{ padding: 16, gap: 8 }}
      renderItem={({ item }) => (
        <YStack {...SURFACE} gap="$1" testID={`wa-member-${item.jid}`}>
          <Text fontWeight="600">{waDisplayName(item.name, item.phone)}</Text>
          <Text color="$muted" fontSize="$2">
            {waNumberLine(t, item.phone, item.is_business)}
          </Text>
        </YStack>
      )}
      ListEmptyComponent={
        <StateView
          loading={members.loading}
          error={members.error}
          empty={t('crm.tools.noMembersFound')}
          onRetry={members.refetch}
        />
      }
    />
  );
}

interface Props {
  group: WaGroupRef | null;
  onClose: () => void;
}

/**
 * The portal's group-members dialog as a full-screen sheet: the members, and
 * the WhatsApp Leads list they were saved to. Back closes it.
 */
export function GroupMembersSheet({ group, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const openLeads = () => {
    onClose();
    navigation.navigate('UserLeads');
  };
  return (
    <Modal visible={!!group} animationType="slide" onRequestClose={onClose}>
      <YStack flex={1} backgroundColor="$background" testID="wa-members-sheet">
        <XStack alignItems="center" gap="$2" paddingHorizontal="$4" paddingVertical="$3">
          <Text flex={1} fontWeight="700" fontSize="$6" role="heading" numberOfLines={2}>
            {group?.name || t('crm.tools.members')}
          </Text>
          <XStack
            role="button"
            aria-label={t('shell.common.close')}
            onPress={onClose}
            padding="$2"
            hitSlop={6}
            testID="wa-members-close"
          >
            <MaterialIcons name="close" size={24} color={theme.color?.val} />
          </XStack>
        </XStack>
        <YStack paddingHorizontal="$4">
          <DuncitButton
            label={t('shell.nav.whatsappLeads')}
            onPress={openLeads}
            variant="outline"
            size="sm"
            fullWidth
            testID="wa-members-leads"
          />
        </YStack>
        {group ? <MembersList key={group.jid} group={group} /> : null}
      </YStack>
    </Modal>
  );
}
