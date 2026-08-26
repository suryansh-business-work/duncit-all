import { MaterialIcons } from '@expo/vector-icons';
import { semantic } from '@duncit/auth-tokens';
import { splitDraftsByExpiry } from '@duncit/utils';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { useAppSettings } from '@/hooks/useAppSettings';
import { useTranslation } from '@/hooks/useTranslation';

import { DraftRow, type DraftRowData } from './DraftRow';

interface Props {
  drafts: readonly DraftRowData[];
  isLoading: boolean;
  onContinue: (id: string) => void;
  onDelete: (id: string) => void;
}

/**
 * Host Studio's Draft pods list — the Tamagui twin of mWeb's HostDraftsCard
 * (rule 27). Drafts the retention sweep deletes within the next 24 hours are
 * lifted out into the info-badge panel at the top; the rest follow below.
 */
export function HostDraftsSection({ drafts, isLoading, onContinue, onDelete }: Readonly<Props>) {
  const { t } = useTranslation();
  const { draftRetentionDays } = useAppSettings();
  const { expiring, rest } = splitDraftsByExpiry(drafts);

  return (
    <YStack gap={16}>
      <Text fontSize={16} fontWeight="700" color="$color">
        {t('mweb.hostManage.draftPods')}
      </Text>
      {drafts.length > 0 ? (
        <XStack
          testID="draft-retention-note"
          gap={8}
          padding={12}
          borderRadius={12}
          borderWidth={1}
          borderColor="$borderColor"
          backgroundColor="$surface"
          alignItems="flex-start"
        >
          <MaterialIcons name="schedule" size={16} color={semantic.warning} />
          <Text flex={1} fontSize={12.5} color="$muted">
            {t('mweb.hostManage.draftRetentionNote', { vars: { days: draftRetentionDays } })}
          </Text>
        </XStack>
      ) : null}
      {isLoading ? <Spinner testID="host-manage-loading" color="$primary" /> : null}
      {!isLoading && drafts.length === 0 ? (
        <Text testID="host-manage-empty" fontSize={13} color="$muted">
          {t('mweb.hostManage.noDraftsYet')}
        </Text>
      ) : null}
      {expiring.length > 0 ? (
        <YStack
          testID="drafts-expiring-panel"
          gap={12}
          padding={12}
          borderRadius={12}
          borderWidth={1}
          borderColor={semantic.warning}
          backgroundColor={`${semantic.warning}14`}
        >
          <XStack gap={8} alignItems="flex-start">
            <MaterialIcons name="info-outline" size={16} color={semantic.warning} />
            <YStack flex={1} gap={2}>
              <Text fontSize={13.5} fontWeight="700" color="$color">
                {t('mweb.hostManage.draftsExpiringSoon')} ({expiring.length})
              </Text>
              <Text fontSize={12} color="$muted">
                {t('mweb.hostManage.draftsExpiringSoonNote')}
              </Text>
            </YStack>
          </XStack>
          {expiring.map((draft) => (
            <DraftRow
              key={draft.id}
              draft={draft}
              expiring
              onContinue={onContinue}
              onDelete={onDelete}
            />
          ))}
        </YStack>
      ) : null}
      {expiring.length > 0 && rest.length > 0 ? (
        <Text fontSize={12} fontWeight="700" color="$muted">
          {t('mweb.hostManage.otherDrafts')}
        </Text>
      ) : null}
      {rest.map((draft) => (
        <DraftRow
          key={draft.id}
          draft={draft}
          expiring={false}
          onContinue={onContinue}
          onDelete={onDelete}
        />
      ))}
    </YStack>
  );
}
