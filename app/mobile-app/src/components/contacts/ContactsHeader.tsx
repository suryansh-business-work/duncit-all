import type { ReactNode } from 'react';
import { YStack } from 'tamagui';
import type { ContactSyncStage } from '@duncit/utils';

import { ContactsAllowCard } from '@/components/contacts/ContactsAllowCard';
import { ContactsFilters } from '@/components/contacts/ContactsFilters';
import type { ContactsScope, ContactsSyncStatus } from '@/hooks/useContacts';
import type { ContactsSyncFailure } from '@/hooks/useContactsSync';

interface SyncState {
  busy: boolean;
  stage: ContactSyncStage | null;
  failure: ContactsSyncFailure | null;
}

interface Props {
  status: ContactsSyncStatus | null;
  sync: Readonly<SyncState>;
  onAllow: () => void;
  scope: ContactsScope;
  onScope: (scope: ContactsScope) => void;
  search: string;
  onSearch: (value: string) => void;
  /** Between the filters and the rows: the radar or the invite bar, and how
   * far the list has loaded. */
  children: ReactNode;
}

/** Everything above the rows, in mWeb's order (rule 27): what the page is,
 * the sync card, the tabs and search, then the radar or the invite bar. */
export function ContactsHeader({
  status,
  sync,
  onAllow,
  scope,
  onScope,
  search,
  onSearch,
  children,
}: Readonly<Props>) {
  return (
    <YStack gap={16} paddingTop={16} paddingBottom={12}>
      <ContactsAllowCard
        status={status}
        busy={sync.busy}
        stage={sync.stage}
        failure={sync.failure}
        onAllow={onAllow}
      />
      <ContactsFilters scope={scope} onScope={onScope} search={search} onSearch={onSearch} />
      <YStack gap={12} paddingHorizontal={16}>
        {children}
      </YStack>
    </YStack>
  );
}
