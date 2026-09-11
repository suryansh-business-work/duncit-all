import { useMemo } from 'react';
import type { InvitableContact } from '@duncit/utils';
import InviteRow from './InviteRow';
import VirtualRows from './VirtualRows';

/** Tick box + avatar + two lines + 8px above and below. Measured once mounted. */
const ROW_ESTIMATE = 60;

const keyOf = (row: InvitableContact) => row.phone_key;

interface Props {
  rows: InvitableContact[];
  /** The search that produced `rows`. */
  resetKey: string;
  selected: string[];
  busyKey: string | null;
  onToggleSelect: (key: string) => void;
  onInviteRow: (key: string) => void;
}

/** The people from the phone book who are not here yet, each with a tick box
 * and its own Invite, windowed so thousands scroll freely. The page renders
 * the invite bar above and the empty state when there are none. Twin of the
 * invite rows in native `ContactsFeed` (rule 27). */
export default function ContactsInviteList({
  rows,
  resetKey,
  selected,
  busyKey,
  onToggleSelect,
  onInviteRow,
}: Readonly<Props>) {
  const selectedKeys = useMemo(() => new Set(selected), [selected]);
  return (
    <VirtualRows
      testId="contacts-invite-list"
      rows={rows}
      keyOf={keyOf}
      estimate={ROW_ESTIMATE}
      resetKey={resetKey}
      renderRow={(row) => (
        <InviteRow
          row={row}
          selected={selectedKeys.has(row.phone_key)}
          busy={busyKey === row.phone_key}
          onToggleSelect={onToggleSelect}
          onInvite={onInviteRow}
        />
      )}
    />
  );
}
