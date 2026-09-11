import { useMemo, useState } from 'react';
import { Text, YStack } from 'tamagui';
import {
  applyContactDraft,
  buildContactChangeLabels,
  contactDetailsComplete,
  type ContactChannel,
  type ContactSnapshot,
} from '@duncit/utils';

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
      <Text fontSize={15} fontWeight="600" color="$color" paddingTop={4}>
        {t('mweb.account.contactDetails')}
      </Text>
      <ContactRows labels={labels} snapshot={snapshot} onChange={setChannel} />
      {contactDetailsComplete(snapshot) ? null : (
        <Text fontSize={12} color="$danger" testID="contact-required">
          {labels.allRequired}
        </Text>
      )}
      <ChangeContactSheet
        channel={channel}
        snapshot={snapshot}
        onClose={() => setChannel(null)}
        onSaved={(saved, draft) => onChanged(saved, applyContactDraft(snapshot, saved, draft))}
      />
    </YStack>
  );
}
