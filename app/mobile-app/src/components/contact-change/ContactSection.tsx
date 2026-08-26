import { useMemo, useState } from 'react';
import { Text, YStack } from 'tamagui';
import { buildContactChangeLabels, type ContactChannel, type ContactSnapshot } from '@duncit/utils';

import { useTranslation } from '@/hooks/useTranslation';
import { ChangeContactSheet } from './ChangeContactSheet';
import { ContactRows } from './ContactRows';

interface Props {
  /** What the account holds now. Updated by `onChanged` after a proved change. */
  snapshot: ContactSnapshot;
  /** Fired once a change is stored, so the caller can refresh what it renders. */
  onChanged: (channel: ContactChannel, snapshot: ContactSnapshot) => void;
}

/**
 * The contact block inside Edit profile: three rows, and the sheet they open.
 * Tamagui twin of mWeb's <ContactSection/>.
 */
export function ContactSection({ snapshot, onChanged }: Readonly<Props>) {
  const { t } = useTranslation();
  const labels = useMemo(() => buildContactChangeLabels(t), [t]);
  const [channel, setChannel] = useState<ContactChannel | null>(null);

  return (
    <YStack gap={6}>
      <Text fontSize={12} fontWeight="700" color="$muted" letterSpacing={0.6}>
        {t('mweb.account.contactDetails')}
      </Text>
      <ContactRows labels={labels} snapshot={snapshot} onChange={setChannel} />
      <ChangeContactSheet
        channel={channel}
        snapshot={snapshot}
        onClose={() => setChannel(null)}
        onSaved={(saved, draft) => {
          // The proved value is folded in locally as well as refetched: the
          // sheet closes onto these rows, and a row still showing the old
          // number while the query is in flight reads as a failed change.
          const next: ContactSnapshot = { ...snapshot };
          if (saved === 'EMAIL') next.email = draft.email.trim().toLowerCase();
          if (saved === 'PHONE') {
            next.phone_extension = draft.extension;
            next.phone_number = draft.number;
          }
          if (saved === 'WHATSAPP') {
            next.whatsapp_extension = draft.extension;
            next.whatsapp_number = draft.number;
          }
          onChanged(saved, next);
        }}
      />
    </YStack>
  );
}
