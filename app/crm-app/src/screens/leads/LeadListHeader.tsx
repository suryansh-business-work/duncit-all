import { MaterialIcons } from '@expo/vector-icons';
import { Input, Text, XStack, YStack, useTheme } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import type { LeadListKind } from '@/features/leads-list/listKinds';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  definition: LeadListKind;
  search: string;
  onSearch: (text: string) => void;
  total: number;
  filterCount: number;
  /** "Within 5 km of you" while a nearby search is on. */
  nearbyLabel: string | null;
  /** What just happened (deleted, created, imported), announced. */
  status: string | null;
  onNew: () => void;
  onFilters: () => void;
  onNearby: () => void;
  onClearNearby: () => void;
  onRecalculate: () => void;
  onFillWithAi: () => void;
  onImport: () => void;
  /** Venue, host and ecomm listings open Data › Services Offered, as the portal's do. */
  onManageServices?: () => void;
}

/** A lead listing's head: its title, the page tools, search, filters and the count — the portal's toolbar. */
export function LeadListHeader(props: Readonly<Props>) {
  const { definition, nearbyLabel, filterCount } = props;
  const { t } = useTranslation();
  const theme = useTheme();
  const icon = (
    name: 'add' | 'near-me' | 'autorenew' | 'auto-fix-high' | 'file-upload' | 'tune' | 'handyman',
    solid = false,
  ) => (
    <MaterialIcons
      name={name}
      size={18}
      color={solid ? theme.onPrimary?.val : theme.accentText?.val}
    />
  );
  return (
    <YStack gap="$2" marginBottom="$3">
      {/* The screen header already names the page; the subtitle says what it is for. */}
      <Text color="$muted">{t(definition.copy.subtitle)}</Text>
      <DuncitButton
        label={t(definition.copy.newLead)}
        onPress={props.onNew}
        icon={icon('add', true)}
        testID="lead-list-new"
      />
      <XStack flexWrap="wrap" gap="$2">
        {nearbyLabel ? null : (
          <DuncitButton
            label={t('crm.nearby.button')}
            onPress={props.onNearby}
            variant="outline"
            size="sm"
            icon={icon('near-me')}
            testID="nearby-open"
          />
        )}
        <DuncitButton
          label={t('crm.leadQualityTab.recalculateScores')}
          onPress={props.onRecalculate}
          variant="outline"
          size="sm"
          icon={icon('autorenew')}
          testID="lead-quality-recalculate-all"
        />
        {definition.bulkCreate ? (
          <>
            <DuncitButton
              label={t('crm.aiFill.button')}
              onPress={props.onFillWithAi}
              variant="outline"
              size="sm"
              icon={icon('auto-fix-high')}
              testID="lead-list-ai"
            />
            <DuncitButton
              label={t('crm.userLeads.import')}
              onPress={props.onImport}
              variant="outline"
              size="sm"
              icon={icon('file-upload')}
              testID="lead-list-import"
            />
          </>
        ) : null}
        {props.onManageServices ? (
          <DuncitButton
            label={t('crm.components.manageServices')}
            onPress={props.onManageServices}
            variant="outline"
            size="sm"
            icon={icon('handyman')}
            testID="lead-list-services"
          />
        ) : null}
      </XStack>
      {nearbyLabel ? (
        <XStack alignItems="center" gap="$2" testID="nearby-chip">
          <DuncitButton
            label={nearbyLabel}
            onPress={props.onNearby}
            variant="outline"
            size="sm"
            icon={icon('near-me')}
            testID="nearby-change-open"
          />
          <DuncitButton
            label={t('crm.nearby.clear')}
            onPress={props.onClearNearby}
            variant="ghost"
            size="sm"
            testID="nearby-clear"
          />
        </XStack>
      ) : null}
      <XStack gap="$2" alignItems="center">
        <Input
          flex={1}
          value={props.search}
          onChangeText={props.onSearch}
          placeholder={t('crmApp.leads.search')}
          aria-label={t('crmApp.leads.search')}
          placeholderTextColor="$muted"
          borderColor="$inputBorder"
          autoCorrect={false}
          testID="lead-list-search"
        />
        <DuncitButton
          label={
            filterCount > 0
              ? `${t('shell.table.filters')} (${filterCount})`
              : t('shell.table.filters')
          }
          onPress={props.onFilters}
          variant={filterCount > 0 ? 'solid' : 'outline'}
          size="sm"
          icon={icon('tune', filterCount > 0)}
          testID="lead-list-filters"
        />
      </XStack>
      {props.status ? (
        <Text color="$success" aria-live="polite" testID="lead-list-status">
          {props.status}
        </Text>
      ) : null}
      {props.total > 0 ? (
        <Text color="$muted" fontSize="$2" aria-live="polite">
          {t('crmApp.leads.count', { count: props.total })}
        </Text>
      ) : null}
    </YStack>
  );
}
