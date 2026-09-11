import { MaterialIcons } from '@expo/vector-icons';
import { splitDraftsByExpiry } from '@duncit/utils';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { EmptyLine } from '@/components/host-manage/HostRowParts';
import { HostSectionHeader } from '@/components/host-manage/HostSectionHeader';
import { RowGroup } from '@/components/host-manage/RowGroup';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useThemeColors } from '@/hooks/useThemeColors';
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
 * lifted out into the warning card at the top; the rest follow below.
 */
export function HostDraftsSection({ drafts, isLoading, onContinue, onDelete }: Readonly<Props>) {
  const { t } = useTranslation();
  const { warning } = useThemeColors();
  const { draftRetentionDays } = useAppSettings();
  const { expiring, rest } = splitDraftsByExpiry(drafts);

  return (
    <YStack gap={12}>
      <HostSectionHeader title={t('mweb.hostManage.draftPods')} count={drafts.length} />
      {drafts.length > 0 ? (
        <XStack testID="draft-retention-note" gap={8} alignItems="flex-start">
          <MaterialIcons name="schedule" size={16} color={warning} />
          <Text flex={1} fontSize={12} color="$muted">
            {t('mweb.hostManage.draftRetentionNote', { vars: { days: draftRetentionDays } })}
          </Text>
        </XStack>
      ) : null}
      {isLoading ? <Spinner testID="host-manage-loading" color="$primary" /> : null}
      {!isLoading && drafts.length === 0 ? (
        <RowGroup>
          <EmptyLine testID="host-manage-empty" text={t('mweb.hostManage.noDraftsYet')} />
        </RowGroup>
      ) : null}
      {expiring.length > 0 ? (
        <RowGroup testID="drafts-expiring-panel" borderColor={warning}>
          <XStack gap={10} alignItems="center" paddingHorizontal={16} paddingVertical={12}>
            <MaterialIcons name="info-outline" size={18} color={warning} />
            <Text flex={1} fontSize={15} fontWeight="600" color="$color">
              {t('mweb.hostManage.draftsExpiringSoon')} ({expiring.length})
            </Text>
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
        </RowGroup>
      ) : null}
      {expiring.length > 0 && rest.length > 0 ? (
        <Text fontSize={11.5} fontWeight="600" color="$muted" textTransform="uppercase">
          {t('mweb.hostManage.otherDrafts')}
        </Text>
      ) : null}
      {rest.length > 0 ? (
        <RowGroup>
          {rest.map((draft) => (
            <DraftRow
              key={draft.id}
              draft={draft}
              expiring={false}
              onContinue={onContinue}
              onDelete={onDelete}
            />
          ))}
        </RowGroup>
      ) : null}
    </YStack>
  );
}
