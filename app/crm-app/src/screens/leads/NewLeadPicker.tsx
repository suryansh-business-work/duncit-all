import { useState } from 'react';
import { XStack, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { LEAD_KINDS, type LeadKind } from '@/features/leads/leadKinds';
import { useTranslation } from '@/hooks/useTranslation';

/** "New lead", then which kind — the portal keeps one list per kind, so the kind comes first. */
export function NewLeadPicker({ onPick }: Readonly<{ onPick: (kind: LeadKind) => void }>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <YStack gap="$2">
      <DuncitButton
        label={open ? t('crmApp.editor.cancelNew') : t('crmApp.editor.newLead')}
        onPress={() => setOpen((value) => !value)}
        variant={open ? 'ghost' : 'solid'}
        size="sm"
        testID="leads-new"
      />
      {open ? (
        <XStack flexWrap="wrap" gap="$2" role="group" aria-label={t('crmApp.editor.pickKind')}>
          {LEAD_KINDS.map((kind) => (
            <DuncitButton
              key={kind}
              label={t(`crmApp.kind.${kind}`)}
              onPress={() => {
                setOpen(false);
                onPick(kind);
              }}
              variant="outline"
              size="sm"
              testID={`leads-new-${kind}`}
            />
          ))}
        </XStack>
      ) : null}
    </YStack>
  );
}
