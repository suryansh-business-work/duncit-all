import { useState } from 'react';

import { ActionSheet } from '@/components/ActionSheet';
import { Fab } from '@/components/mobile/Fab';
import { LEAD_KINDS, type LeadKind } from '@/features/leads/leadKinds';
import { useTranslation } from '@/hooks/useTranslation';

/** Each kind's icon in the picker, the same marks the More tab's lead pages carry. */
const KIND_ICON = {
  VENUE_LEAD: 'my-location',
  HOST_LEAD: 'groups',
  ECOMM_LEAD: 'inventory-2',
  CREATOR_LEAD: 'campaign',
  COMMUNITY_LEAD: 'diversity-3',
} as const satisfies Record<LeadKind, string>;

/**
 * "New lead" as the floating button under the thumb, then which kind from a
 * bottom sheet: the portal keeps one list per kind, so the kind comes first.
 */
export function NewLeadPicker({ onPick }: Readonly<{ onPick: (kind: LeadKind) => void }>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Fab
        icon="add"
        label={t('crmApp.editor.newLead')}
        onPress={() => setOpen(true)}
        testID="leads-new"
      />
      <ActionSheet
        open={open}
        title={t('crmApp.editor.pickKind')}
        actions={LEAD_KINDS.map((kind) => ({
          key: kind,
          label: t(`crmApp.kind.${kind}`),
          icon: KIND_ICON[kind],
          onPress: () => onPick(kind),
        }))}
        onClose={() => setOpen(false)}
        testID="leads-new-kind"
      />
    </>
  );
}
