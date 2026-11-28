import { ActionSheet, type SheetAction } from '@/components/ActionSheet';
import type { LeadListKind } from '@/features/leads-list/listKinds';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  open: boolean;
  definition: LeadListKind;
  /** A nearby search is on, so the item reads "change" rather than start one. */
  nearbyOn: boolean;
  onNearby: () => void;
  onRecalculate: () => void;
  onFillWithAi: () => void;
  onImport: () => void;
  /** Venue, host and ecomm listings open Data › Services Offered, as the portal's do. */
  onManageServices?: () => void;
  onClose: () => void;
}

/**
 * A listing's page tools (the portal's toolbar buttons) in one sheet from the
 * app bar's ⋯: Nearby leads, Recalculate scores, Fill with AI and Excel import
 * (venue and host), and Manage services. Every tool the portal has is here.
 */
export function LeadListToolsMenu({
  open,
  definition,
  nearbyOn,
  onNearby,
  onRecalculate,
  onFillWithAi,
  onImport,
  onManageServices,
  onClose,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const actions: SheetAction[] = [
    {
      key: 'nearby',
      label: nearbyOn ? t('crm.nearby.changeSearch') : t('crm.nearby.button'),
      icon: 'near-me',
      onPress: onNearby,
    },
    {
      key: 'recalculate',
      label: t('crm.leadQualityTab.recalculateScores'),
      icon: 'autorenew',
      onPress: onRecalculate,
    },
  ];
  if (definition.bulkCreate)
    actions.push(
      { key: 'ai', label: t('crm.aiFill.button'), icon: 'auto-fix-high', onPress: onFillWithAi },
      { key: 'import', label: t('crm.userLeads.import'), icon: 'file-upload', onPress: onImport },
    );
  if (onManageServices)
    actions.push({
      key: 'services',
      label: t('crm.components.manageServices'),
      icon: 'handyman',
      onPress: onManageServices,
    });
  return (
    <ActionSheet
      open={open}
      title={t(definition.copy.title)}
      actions={actions}
      onClose={onClose}
      testID="lead-list-tools"
    />
  );
}
